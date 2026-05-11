// app.js — Orchestration, routing, game loop avec streaming + préchargement + lazy-load

import { Storage } from './storage.js';
import {
  applyImpact, checkGameOver, determineEndingType, calculateScore,
  evaluateAchievements, appendHistory, appendKeyFact, advanceYear,
  computeReignStats, evaluateRelicUnlocks, adjustAdvisorLoyalty, advanceAdvisorTurn,
  checkArcTrigger, getActiveArcPhase, tryResolveArc, NARRATIVE_ARCS,
  GAUGE_KEYS, clamp, driftTraits, updateNeighborAttitudes, advanceMarket, applyTechBonuses
} from './game-engine.js';
import { evaluateCustomChoice, generateConsequence, generateEpitaph, generateEvent, evaluateProphecies } from './ai-narrator.js';
import { cancelAllInFlight, hasAI } from './ai-client.js';
import { initI18n } from './i18n.js';

const PANELS = ['setup', 'game', 'consequence', 'gameover', 'history', 'history-detail', 'settings', 'shared', 'profile'];

let _root = null;
let _currentPanel = null;
let _currentGameState = null;
let _isProcessingChoice = false;

// Préchargement de l'event suivant pendant que l'utilisateur lit la conséquence
let _preloadedEvent = null;

async function init() {
  _root = document.getElementById('app');
  if (!_root) return;

  await Storage.init();
  initI18n();

  // Onboarding au premier lancement (avant le routing initial)
  try {
    const { shouldShowOnboarding, showOnboarding } = await import('./ui-onboarding.js');
    if (shouldShowOnboarding()) {
      await showOnboarding();
    }
  } catch (err) { console.warn('[onboarding] failed:', err); }

  // Re-rendu automatique du panel courant à chaque changement de langue
  document.addEventListener('regne:locale-change', () => {
    if (_currentPanel) navigate(_currentPanel);
  });

  // Re-sync de _currentGameState quand un module externe modifie Storage
  // (ex : modale R&D qui débite le trésor + augmente un palier de tech).
  document.addEventListener('regne:state-synced', () => {
    if (!_currentGameState) return;
    const fresh = Storage.getCurrentGame();
    if (fresh && fresh.gameId === _currentGameState.gameId) {
      _currentGameState = fresh;
    }
  });

  // Applique les préférences d'accessibilité au démarrage
  const _s = Storage.getSettings();
  if (_s.readingMode) document.body.classList.add('regne-reading-mode');
  if (_s.highContrast) document.body.classList.add('regne-high-contrast');

  document.addEventListener('regne:navigate', (ev) => {
    const detail = ev.detail || {};
    if (detail.payload?.resetGame) {
      _currentGameState = null;
      _preloadedEvent = null;
    }
    navigate(detail.panel, detail.payload);
  });

  // Détection d'un règne partagé via URL ?regne=base64
  const shared = parseSharedUrl();
  if (shared) {
    return showSharedReign(shared);
  }

  const settings = Storage.getSettings();
  const current = Storage.getCurrentGame();

  if (!hasAI(settings)) {
    navigate('settings');
    showFirstRunBanner();
  } else if (current && !current.ended) {
    _currentGameState = migrateSaveIfNeeded(current);
    navigate('setup'); // bannière "Reprendre"
  } else {
    navigate('setup');
  }
}

// Migration des saves antérieurs aux features WSS.
// Si un user reprend une partie commencée avant l'ajout de market/tech/neighbors/initialTraits/...,
// on initialise les champs manquants pour éviter les crashes runtime.
function migrateSaveIfNeeded(gs) {
  if (!gs || typeof gs !== 'object') return gs;
  let mutated = false;
  // Champs ajoutés par les WSS features
  if (!gs.market) { gs.market = { vivres: 1.0, metaux: 1.0, devise: 1.0 }; mutated = true; }
  if (!gs.tech) { gs.tech = { economy: 0, military: 0, society: 0, innovation: 0 }; mutated = true; }
  if (!Array.isArray(gs.neighbors)) {
    // On n'invente pas de voisins rétroactivement (ça casserait la cohérence narrative).
    // On laisse une liste vide — le bandeau ne s'affichera pas, l'IA n'en mentionnera pas.
    gs.neighbors = []; mutated = true;
  }
  if (!gs.initialTraits) { gs.initialTraits = { ...(gs.traits || { pragmatism: 50, force: 50, tradition: 50, discretion: 50 }) }; mutated = true; }
  if (!Array.isArray(gs.arcsCompleted)) { gs.arcsCompleted = []; mutated = true; }
  if (!Array.isArray(gs.secretsTriggered)) { gs.secretsTriggered = []; mutated = true; }
  if (!Array.isArray(gs.recentOfflineEventIds)) { gs.recentOfflineEventIds = []; mutated = true; }
  if (typeof gs.heritageCrises !== 'number') { gs.heritageCrises = 0; mutated = true; }
  if (typeof gs.eraIndex !== 'number') { gs.eraIndex = 0; mutated = true; }
  if (!gs.mode) { gs.mode = 'classic'; mutated = true; }
  // Persiste si on a complété des champs
  if (mutated) {
    try { Storage.saveCurrentGame(gs); } catch (err) { console.warn('[migrate] save failed:', err); }
  }
  return gs;
}

// Lazy-load des modules UI à la première utilisation
const _modulePromises = {};
function loadModule(name) {
  if (!_modulePromises[name]) {
    _modulePromises[name] = import(`./ui-${name}.js`);
  }
  return _modulePromises[name];
}

async function navigate(panel, payload = null) {
  if (!PANELS.includes(panel)) {
    console.warn('Panel inconnu:', panel);
    return;
  }
  // Annule toutes les requêtes IA en vol pour éviter les races sur _streamCtrl /
  // _currentGameState (réponse tardive d'un panel qu'on quitte).
  // Exception : transition game → consequence — on garde le streaming en cours.
  if (_currentPanel && _currentPanel !== panel && !(panel === 'consequence' && _currentPanel === 'game')) {
    cancelAllInFlight(`navigate ${_currentPanel}→${panel}`);
  }
  // Cleanup intervals/timers du panel game si on le quitte vraiment.
  // On utilise le module DÉJÀ chargé (pas de loadModule qui charge à la volée pour rien).
  if (_currentPanel === 'game' && panel !== 'game' && panel !== 'consequence' && _modulePromises.game) {
    try {
      const m = await _modulePromises.game;
      if (typeof m.cleanupGame === 'function') m.cleanupGame();
    } catch (err) { console.warn('[cleanup] game module:', err); }
  }
  _currentPanel = panel;

  _root.innerHTML = `<div id="panel-container" class="panel active"><div class="event-loading"><div class="spinner-large"></div></div></div>`;
  const container = _root.querySelector('#panel-container');

  switch (panel) {
    case 'setup': {
      const m = await loadModule('setup');
      m.renderSetup(container, (gs) => {
        _currentGameState = gs;
        _preloadedEvent = null;
        navigate('game');
      });
      break;
    }

    case 'game': {
      if (!_currentGameState) { navigate('setup'); return; }
      const m = await loadModule('game');
      m.renderGame(container, _currentGameState, handleChoice, _preloadedEvent);
      _preloadedEvent = null;
      break;
    }

    case 'consequence':
      if (!payload) { navigate('game'); return; }
      runConsequencePanel(container, payload);
      break;

    case 'gameover': {
      const m = await loadModule('gameover');
      m.renderGameOver(container, payload, {
        onNewGame: async (mode) => {
          Storage.clearCurrentGame();
          _currentGameState = null;
          _preloadedEvent = null;
          if (mode === 'plus') {
            // NewGame+ : on redirige vers setup avec un flag
            try { sessionStorage.setItem('regne_newgame_plus', '1'); } catch {}
          }
          if (mode === 'normal') {
            // Nouvelle dynastie : on coupe la lignée courante
            Storage.endCurrentDynasty();
          }
          if (mode === 'lineage') {
            // Continuer la lignée : flag dans ui-setup pour conserver dynasty
            const setupMod = await loadModule('setup');
            if (setupMod.setContinueLineage) setupMod.setContinueLineage(true);
          }
          navigate('setup');
        },
        onHistory: () => navigate('history'),
        onShare: (gameSummary) => shareReign(gameSummary)
      });
      break;
    }

    case 'history': {
      const m = await loadModule('history');
      m.renderHistory(container, {
        onSelect: (gameId) => navigate('history-detail', { gameId }),
        onBack: () => navigate(_currentGameState ? 'game' : 'setup')
      });
      break;
    }

    case 'history-detail': {
      const m = await loadModule('history');
      m.renderHistoryDetail(container, payload?.gameId, {
        onBack: () => navigate('history')
      });
      break;
    }

    case 'settings': {
      const m = await loadModule('settings');
      m.renderSettings(container, {
        onBack: () => navigate(_currentGameState ? 'game' : 'setup')
      });
      break;
    }

    case 'shared': {
      const m = await loadModule('shared');
      m.renderShared(container, payload, { onContinue: () => navigate('setup') });
      break;
    }

    case 'profile': {
      const m = await loadModule('profile');
      m.renderProfile(container, { onBack: () => navigate(_currentGameState ? 'game' : 'setup') });
      break;
    }
  }
}

// --- GAME LOOP avec streaming + préchargement ---

let _streamCtrl = null;

async function handleChoice(payload) {
  if (_isProcessingChoice) return;
  _isProcessingChoice = true;
  const streamGameId = _currentGameState?.gameId || null;

  const { event, choiceIndex, customText, gaugesBefore } = payload;
  const choice = event.choices[choiceIndex];

  let impacts;
  let customEvaluation = null;
  let isFallback = false;
  let consequenceText = '';

  // Buffer pour les chunks reçus avant que le shell ne soit prêt
  const earlyChunks = [];
  let streamReady = false;
  const onChunk = (c) => {
    if (streamReady && _streamCtrl) {
      _streamCtrl.appendText(c);
    } else {
      earlyChunks.push(c);
    }
  };

  // Affiche le shell de conséquence immédiatement
  const initialPayload = {
    event,
    choiceIndex,
    choice,
    customText,
    customEvaluation: null,
    consequence: '',
    gaugesBefore,
    gaugesAfter: { ...gaugesBefore },
    isFallback: false
  };
  await navigate('consequence', initialPayload);
  streamReady = true;
  // Vide le buffer accumulé
  for (const c of earlyChunks) if (_streamCtrl) _streamCtrl.appendText(c);
  earlyChunks.length = 0;

  try {
    if (choiceIndex === 4) {
      const evalResult = await evaluateCustomChoice(_currentGameState, event, customText);
      customEvaluation = evalResult.evaluation;
      impacts = customEvaluation.impacts;
      consequenceText = customEvaluation.consequence;
      _currentGameState.totalTokensUsed = (_currentGameState.totalTokensUsed || 0) + (evalResult.tokensIn || 0) + (evalResult.tokensOut || 0);
      _currentGameState.totalCostUsd = (_currentGameState.totalCostUsd || 0) + (evalResult.cost || 0);
      isFallback = !!evalResult.fallback;

      if (_streamCtrl) {
        _streamCtrl.setCustomEvaluation(customEvaluation);
        await streamText(consequenceText, onChunk);
      }
    } else {
      impacts = choice.hiddenImpacts || {};
      const consResult = await generateConsequence(
        _currentGameState, event, choiceIndex, gaugesBefore,
        applyImpact(gaugesBefore, impacts, _currentGameState?.activeRelics),
        onChunk
      );
      consequenceText = consResult.consequence;
      _currentGameState.totalTokensUsed = (_currentGameState.totalTokensUsed || 0) + (consResult.tokensIn || 0) + (consResult.tokensOut || 0);
      _currentGameState.totalCostUsd = (_currentGameState.totalCostUsd || 0) + (consResult.cost || 0);
      if (consResult.fallback) isFallback = true;
    }
  } catch (err) {
    console.error('Erreur traitement choix:', err);
    impacts = impacts || {};
    consequenceText = consequenceText || `Erreur lors du traitement : ${err.message || err}`;
    isFallback = true;
  }

  // Garde-fou : si la partie a été abandonnée pendant la génération
  // (l'utilisateur a cliqué "Abandonner" ou a redémarré), on n'écrit RIEN sur
  // le nouvel état. Évite la corruption de _currentGameState.
  if (!_currentGameState || _currentGameState.gameId !== streamGameId) {
    _isProcessingChoice = false;
    return;
  }

  const gaugesAfter = applyImpact(gaugesBefore, impacts, _currentGameState?.activeRelics);

  // Mise à jour du game state
  _currentGameState.gauges = gaugesAfter;
  _currentGameState.history = appendHistory(_currentGameState.history, {
    turn: _currentGameState.turn,
    choiceText: choice.label === 'Votre décision…' ? `Décision libre : ${(customText || '').slice(0, 60)}` : choice.label,
    outcome: consequenceText.slice(0, 120)
  });

  // Track flagged decisions (alliances, guerres, exécutions… repérables via mots-clés)
  const flagged = isFlaggedDecision(event, choice, customText);

  _currentGameState.choiceHistory = [...(_currentGameState.choiceHistory || []), {
    turn: _currentGameState.turn,
    eventTitle: event.title,
    eventCategory: event.category,
    choiceIndex,
    choiceLabel: choice.label,
    philosophy: choice.philosophy || (customEvaluation?.philosophy || 'libre'),
    isCustom: choiceIndex === 4,
    customText: choiceIndex === 4 ? customText : null,
    impacts,
    gaugesBefore,
    gaugesAfter,
    consequence: consequenceText,
    flagged: flagged ? flagged : null,
    timestamp: Date.now()
  }];
  if (event.keyFactIfChosen) {
    _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, event.keyFactIfChosen);
  }
  if (flagged) {
    _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `Tour ${_currentGameState.turn} : ${flagged}`);
  }
  _currentGameState.year = advanceYear(_currentGameState.year, _currentGameState.country.era);
  _currentGameState.turn += 1;

  // Phase 3.3 : arcs narratifs — déclenche / fait avancer / résout l'arc actif
  try {
    if (!_currentGameState.activeArcId) {
      const triggered = checkArcTrigger(_currentGameState);
      if (triggered) {
        const arc = NARRATIVE_ARCS.find((a) => a.id === triggered);
        if (arc) {
          _currentGameState.activeArcId = triggered;
          _currentGameState.arcStartTurn = _currentGameState.turn;
          _currentGameState.activeArcHint = arc.phases[0].hint;
          _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `Arc « ${arc.name} » s'amorce.`);
        }
      }
    } else {
      // Avance phase + tente résolution
      const ph = getActiveArcPhase(_currentGameState);
      if (ph) _currentGameState.activeArcHint = ph.phase.hint;
      const res = tryResolveArc(_currentGameState);
      if (res?.resolved) {
        const arc = NARRATIVE_ARCS.find((a) => a.id === res.arcId);
        // Applique les impacts de résolution
        _currentGameState.gauges = applyImpact(_currentGameState.gauges, res.impacts, _currentGameState.activeRelics);
        _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, res.won
          ? `L'arc « ${arc?.name} » s'achève en votre faveur.`
          : `L'arc « ${arc?.name} » se conclut mal.`);
        _currentGameState.arcsCompleted = [...(_currentGameState.arcsCompleted || []), res.arcId];
        _currentGameState.activeArcId = null;
        _currentGameState.arcStartTurn = null;
        _currentGameState.activeArcHint = null;
      }
    }
  } catch (err) { console.warn('[arcs] turn update failed:', err); }

  // Phase 3.4 : événements secrets — déclencheurs cachés
  try {
    const secret = checkSecretTriggers(_currentGameState);
    if (secret) {
      _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, secret.fact);
      _currentGameState.gauges = applyImpact(_currentGameState.gauges, secret.impacts, _currentGameState.activeRelics);
      _currentGameState.secretsTriggered = [...(_currentGameState.secretsTriggered || []), secret.id];
      // Toast non bloquant
      import('./ui-toast.js').then((m) => m.toastSuccess(`📜 ${secret.title}`)).catch(() => {});
      import('./audio.js').then((m) => m.playTone('unlock')).catch(() => {});
    }
  } catch (err) { console.warn('[secrets] check failed:', err); }

  // Phase 4 : conseillers vivants — loyauté + tour avancé + détection trahison/mort
  try {
    const upd = adjustAdvisorLoyalty(_currentGameState.advisors, choice, impacts);
    advanceAdvisorTurn(_currentGameState.advisors);
    if (upd?.betrayed) {
      // Conseiller à très basse loyauté : événement narratif "trahison" injecté en keyFact
      _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `${upd.advisorId} trahit la couronne (loyauté ${upd.loyalty}).`);
      // Marque comme deceased (fui ou exécuté — laissé à l'imagination)
      const a = _currentGameState.advisors.find((x) => x.name === upd.advisorId);
      if (a) a.status = 'deceased';
    }
  } catch (err) { console.warn('[advisors] loyalty update failed:', err); }

  // Phase WSS-6 : Arbre R&D — bonus passifs des paliers débloqués
  try {
    if (_currentGameState.tech) {
      _currentGameState.gauges = applyTechBonuses(_currentGameState.gauges, _currentGameState.tech, _currentGameState.turn);
    }
  } catch (err) { console.warn('[tech] bonus failed:', err); }

  // Phase WSS-5 : Marché mondial — random walk + impacts mineurs sur économie/trésor
  try {
    const mkt = advanceMarket(_currentGameState.market, _currentGameState.turn);
    _currentGameState.market = mkt.market;
    if (mkt.impacts && Object.keys(mkt.impacts).length) {
      _currentGameState.gauges = applyImpact(_currentGameState.gauges, mkt.impacts, _currentGameState.activeRelics);
    }
  } catch (err) { console.warn('[market] advance failed:', err); }

  // Phase WSS-4 : Diplomatie — les voisins ajustent leur attitude
  try {
    const upd = updateNeighborAttitudes(_currentGameState.neighbors, choice, impacts, _currentGameState.turn);
    if (upd && Math.abs(upd.delta) >= 5) {
      const verb = upd.delta > 0 ? 'se rapproche' : 's\'éloigne';
      _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `${upd.name || upd.neighborName} ${verb} de votre couronne (attitude ${upd.attitude}).`);
    }
  } catch (err) { console.warn('[neighbors] update failed:', err); }

  // Phase WSS-1 : Idéologie évolutive — les traits dérivent selon la philosophie du choix
  try {
    const philosophy = choice.philosophy || (customEvaluation?.philosophy) || 'pragmatique';
    const drift = driftTraits(_currentGameState.traits, philosophy, _currentGameState.initialTraits);
    _currentGameState.traits = drift.traits;
    if (drift.drifted) {
      _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `Le règne devient ${drift.drifted.label}.`);
      import('./ui-toast.js').then((m) => {
        const t = globalThis.__i18n_t || ((k, p) => k);
        m.showToast(t('drift_toast', { label: drift.drifted.label }), { type: 'info' });
      }).catch(() => {});
    }
  } catch (err) { console.warn('[traits] drift failed:', err); }

  Storage.saveCurrentGame(_currentGameState);

  // Finaliser le panel conséquence
  if (_streamCtrl) {
    _streamCtrl.finalize({ consequence: consequenceText, gaugesBefore, gaugesAfter, isFallback });
  }

  _isProcessingChoice = false;

  // Phase 3.1 : Mode Héritage — game over remplacé par "Crise dynastique"
  // Chaque crise consomme une vie sur 3. Au 4e épuisement, fin définitive.
  const rawGo = checkGameOver(_currentGameState.gauges);
  let goCheck = rawGo;
  if (rawGo.over && _currentGameState.mode === 'heritage') {
    const usedCrises = _currentGameState.heritageCrises || 0;
    if (usedCrises < 3) {
      // Crise au lieu de game over : la jauge fautive remonte de 30 (mais pas plus de 60)
      const next = { ..._currentGameState.gauges };
      next[rawGo.gauge] = clamp(next[rawGo.gauge] + 30, 5, 60);
      _currentGameState.gauges = next;
      _currentGameState.heritageCrises = usedCrises + 1;
      _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `Crise dynastique #${usedCrises + 1} (${rawGo.gauge}) surmontée. ${3 - (usedCrises + 1)} ⚡ restantes.`);
      import('./ui-toast.js').then((m) => {
        const t = globalThis.__i18n_t || ((k, p) => k);
        m.toastWarn(t('crisis_dynastic', { label: rawGo.label, n: 3 - (usedCrises + 1) }));
      }).catch(() => {});
      goCheck = { over: false };
    }
  }

  // Phase 3.2 : Mode Chronique — pas de game over par jauges (clampées à 5..95) + ères tous les 25 tours
  if (_currentGameState.mode === 'chronicle') {
    const next = { ..._currentGameState.gauges };
    for (const k of GAUGE_KEYS) next[k] = clamp(next[k], 5, 95);
    _currentGameState.gauges = next;
    goCheck = { over: false };
    if (_currentGameState.turn % 25 === 0) {
      const era = (_currentGameState.eraIndex || 0) + 1;
      _currentGameState.eraIndex = era;
      _currentGameState.keyFacts = appendKeyFact(_currentGameState.keyFacts, `Une nouvelle ère commence — Ère ${era}.`);
      import('./ui-toast.js').then((m) => {
        const t = globalThis.__i18n_t || ((k, p) => k);
        m.toastSuccess(t('era_transition', { n: era }));
      }).catch(() => {});
    }
  }

  if (!goCheck.over) {
    preloadNextEvent();
  }
}

async function preloadNextEvent() {
  if (!_currentGameState) return;
  try {
    const result = await generateEvent(_currentGameState);
    if (result?.event) {
      _preloadedEvent = result;
      _currentGameState.totalTokensUsed = (_currentGameState.totalTokensUsed || 0) + (result.tokensIn || 0) + (result.tokensOut || 0);
      _currentGameState.totalCostUsd = (_currentGameState.totalCostUsd || 0) + (result.cost || 0);
      Storage.saveCurrentGame(_currentGameState);
    }
  } catch (err) {
    // Échec silencieux : l'event sera regénéré au prochain navigate('game')
    console.warn('Preload event failed:', err.message || err);
  }
}

function isFlaggedDecision(event, choice, customText) {
  const text = `${choice.label || ''} ${choice.description || ''} ${customText || ''}`.toLowerCase();
  if (/guerre|attaqu|invasion|annex/.test(text)) return `Décision belliqueuse : "${choice.label}"`;
  if (/alliance|trait[ée]|paix|coalition/.test(text)) return `Alliance / paix : "${choice.label}"`;
  if (/ex[ée]cut|emprison|purg|massacr/.test(text)) return `Décision répressive : "${choice.label}"`;
  if (/r[ée]volut|abdic|rendre le pouvoir/.test(text)) return `Bouleversement politique : "${choice.label}"`;
  if (/r[ée]forme|constitution/.test(text)) return `Réforme majeure : "${choice.label}"`;
  return null;
}

function runConsequencePanel(container, payload) {
  // Import statique safe : le module est petit
  return import('./ui-consequence.js').then((m) => {
    _streamCtrl = m.renderConsequenceShell(container, payload, () => {
      const goCheck = checkGameOver(_currentGameState.gauges);
      if (goCheck.over) {
        endRun(goCheck.label);
      } else {
        navigate('game');
      }
    });
  });
}

async function streamText(text, onChunk) {
  if (!text) return;
  const words = text.split(/(\s+)/);
  for (const w of words) {
    onChunk(w);
    await sleep(15);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// --- FIN DE PARTIE ---

async function endRun(gameOverReason) {
  const gs = _currentGameState;
  const realTurns = Math.max(1, gs.turn - 1);
  const endingType = determineEndingType(gs.gauges, realTurns);
  const records = Storage.getRecords();
  const achievements = evaluateAchievements(
    { ...gs, turn: realTurns, totalGames: (records.totalGames || 0) + 1, score: 0 },
    gs.choiceHistory || []
  );
  let score = calculateScore(realTurns, gs.gauges, endingType, achievements, gs.activeRelics || []);
  // Bonus mode Héritage : ×1.5 sans crise, ×1.2 avec 1, ×1.0 avec 2.
  if (gs.mode === 'heritage') {
    const c = gs.heritageCrises || 0;
    const m = c === 0 ? 1.5 : (c === 1 ? 1.2 : 1.0);
    score = Math.round(score * m);
  }

  // Détection des achievements ENCORE déclenchés par le score final
  const achievementsWithScore = evaluateAchievements(
    { ...gs, turn: realTurns, totalGames: (records.totalGames || 0) + 1, score },
    gs.choiceHistory || []
  );

  // Streaming de l'épitaphe
  _root.innerHTML = `
    <div id="panel-container" class="panel active">
      <div class="consequence-screen">
        <article class="consequence-card">
          <h2 class="consequence-header royal-title">L'HISTORIEN ÉCRIT VOTRE ÉPITAPHE…</h2>
          <div class="hr-fancy"></div>
          <div class="consequence-narrative" id="epitaph-stream">
            <span class="streaming-cursor">▍</span>
          </div>
        </article>
      </div>
    </div>
  `;
  const epitaphEl = _root.querySelector('#epitaph-stream');
  let epitaphBuffer = '';
  let firstChunk = true;
  let rafId = null;
  const flush = () => {
    rafId = null;
    epitaphEl.innerHTML = epitaphBuffer
      .split(/\n+/).filter(Boolean).map((p) => `<p>${escapeHtmlSimple(p)}</p>`).join('') +
      '<span class="streaming-cursor">▍</span>';
  };

  let epitaph = '';
  let isFallback = false;
  try {
    const ep = await generateEpitaph(gs, endingType, gameOverReason, (chunk) => {
      if (firstChunk) { epitaphEl.innerHTML = '<span class="streaming-cursor">▍</span>'; firstChunk = false; }
      epitaphBuffer += chunk;
      if (rafId == null) {
        rafId = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(flush) : setTimeout(flush, 16);
      }
    });
    epitaph = ep.epitaph;
    gs.totalTokensUsed = (gs.totalTokensUsed || 0) + (ep.tokensIn || 0) + (ep.tokensOut || 0);
    gs.totalCostUsd = (gs.totalCostUsd || 0) + (ep.cost || 0);
    if (ep.fallback) isFallback = true;
  } catch (err) {
    epitaph = `Le règne s'est achevé. Cause : ${gameOverReason}.`;
    isFallback = true;
  }

  await sleep(800);

  // Statistiques de règne
  const stats = computeReignStats(gs.choiceHistory || [], gs.gauges, gs.startingGauges);

  const completed = {
    id: gs.gameId,
    startedAt: gs.started,
    endedAt: Date.now(),
    ended: true,
    country: gs.country,
    difficulty: gs.difficulty,
    genre: gs.genre,
    traits: gs.traits || null,
    finalScore: score,
    endingType,
    endingNarrative: epitaph,
    gameOverReason,
    totalTurns: realTurns,
    finalGauges: gs.gauges,
    startingGauges: gs.startingGauges,
    achievements: achievementsWithScore,
    stats,
    totalTokensUsed: gs.totalTokensUsed || 0,
    totalCostUsd: gs.totalCostUsd || 0,
    turns: (gs.choiceHistory || []).map((c) => ({
      turnNumber: c.turn,
      event: { title: c.eventTitle, category: c.eventCategory },
      choiceIndex: c.choiceIndex,
      choiceText: c.choiceLabel,
      philosophy: c.philosophy,
      consequence: c.consequence,
      gaugesBefore: c.gaugesBefore,
      gaugesAfter: c.gaugesAfter,
      isCustom: c.isCustom,
      customText: c.customText,
      flagged: c.flagged
    }))
  };

  try {
    await Storage.saveCompletedGame(completed);
  } catch (err) {
    console.error('Erreur sauvegarde partie:', err);
  }

  Storage.updateRecords(score, endingType, realTurns, achievementsWithScore, { genre: gs.genre, isNewGamePlus: gs.isNewGamePlus });
  // Streak quotidien (Phase 5.3)
  try { Storage.updateStreak(); } catch (err) { console.warn('[gameover] streak update failed:', err); }

  // Son de game over (silencieux si l'utilisateur n'a pas activé l'audio)
  import('./audio.js').then((m) => m.playTone('gameover')).catch(() => {});

  // --- Phase 1 : reliques + dynastie ---
  // Stats enrichies pour évaluer les conditions de déblocage des reliques.
  const relicStats = {
    endingType,
    totalTurns: realTurns,
    customCount: stats?.customCount || 0,
    militaryChoices: (gs.choiceHistory || []).filter((c) => c.philosophy === 'militariste').length,
    economyChoices: (gs.choiceHistory || []).filter((c) => ['libre', 'pragmatique'].includes(c.philosophy) && (c.impacts?.economy || 0) > 0).length,
    philosophyDominantId: stats?.philosophyDominant?.id || null,
    totalLegendary: Storage.getRecords().endingTypeCount?.legendary || 0
  };
  const meta = Storage.getMeta();
  const newlyUnlockedRelics = evaluateRelicUnlocks(relicStats, meta.unlockedRelics);
  if (newlyUnlockedRelics.length) Storage.unlockRelics(newlyUnlockedRelics);

  // Dynastie : enregistre la génération qui se termine.
  let dynastyInfo = null;
  try {
    Storage.recordDynastyGeneration({ gameId: gs.gameId, finalScore: score, endingType, totalTurns: realTurns });
    dynastyInfo = Storage.getCurrentDynasty();
  } catch (err) {
    console.warn('[gameover] dynasty record failed:', err);
  }

  Storage.clearCurrentGame();
  _currentGameState = null;
  _preloadedEvent = null;

  // Évaluation des prophéties (Phase 7.5)
  const propheciesEvaluated = evaluateProphecies(gs.prophecies || [], gs, completed);

  navigate('gameover', {
    gameState: { ...gs, turn: realTurns },
    endingType,
    gameOverReason,
    epitaph,
    score,
    achievements: achievementsWithScore,
    stats,
    completed,
    isFallback,
    newlyUnlockedRelics,
    dynastyInfo,
    prophecies: propheciesEvaluated
  });
}

// --- PHASE 3.4 — ÉVÉNEMENTS SECRETS ---
// Déclencheurs cachés qui s'activent une seule fois par règne quand des combinaisons
// très spécifiques de jauges / philosophies sont rencontrées.
const SECRET_TRIGGERS = [
  {
    id: 'golden_age',
    title: 'L\'Âge d\'Or',
    test: (s) => GAUGE_KEYS.every((k) => (s.gauges?.[k] || 0) >= 75) && (s.goldenAgeStreak || 0) >= 5,
    fact: 'L\'Histoire évoque déjà votre règne comme un Âge d\'Or.',
    impacts: { economy: 5, support: 5 }
  },
  {
    id: 'people_feeds_lords',
    title: 'Le Peuple Nourrit ses Maîtres',
    test: (s) => (s.gauges?.treasury || 0) <= 5 && (s.gauges?.support || 0) >= 80,
    fact: 'Le peuple, par ferveur, comble le trésor vide de ses propres mains.',
    impacts: { treasury: 25 }
  },
  {
    id: 'spirit_of_conquest',
    title: 'L\'Esprit de Conquête',
    test: (s, ch) => (ch || []).slice(-10).filter((c) => c.philosophy === 'militariste').length >= 10,
    fact: 'Vos armées vous suivent aveuglément — l\'Esprit de Conquête vous habite.',
    impacts: { military: 12, diplomacy: -5 }
  },
  {
    id: 'unpredictable_sovereign',
    title: 'Le Souverain Imprévisible',
    test: (s, ch) => (ch || []).slice(-3).filter((c) => c.isCustom).length >= 3,
    fact: 'Votre imprévisibilité déconcerte vos rivaux.',
    impacts: { diplomacy: 10 }
  },
  {
    id: 'iron_oath',
    title: 'Serment de Fer',
    test: (s) => (s.gauges?.military || 0) >= 90 && (s.gauges?.support || 0) >= 70,
    fact: 'Armée et peuple unis dans un même serment.',
    impacts: { support: 5, military: 5 }
  }
];

function checkSecretTriggers(gs) {
  if (!gs) return null;
  // Tracker streak âge d'or
  if (GAUGE_KEYS.every((k) => (gs.gauges?.[k] || 0) >= 75)) {
    gs.goldenAgeStreak = (gs.goldenAgeStreak || 0) + 1;
  } else {
    gs.goldenAgeStreak = 0;
  }
  const triggered = new Set(gs.secretsTriggered || []);
  for (const s of SECRET_TRIGGERS) {
    if (triggered.has(s.id)) continue;
    try {
      if (s.test(gs, gs.choiceHistory)) return s;
    } catch {}
  }
  return null;
}

// --- PARTAGE D'UN RÈGNE VIA URL ---

function shareReign(completed) {
  const compact = {
    n: completed.country?.name,
    f: completed.country?.flag,
    e: completed.country?.eraLabel || completed.country?.era,
    lt: completed.country?.leaderTitle,
    ln: completed.country?.leaderName,
    s: completed.finalScore,
    t: completed.totalTurns,
    et: completed.endingType,
    g: completed.finalGauges,
    ach: completed.achievements,
    ph: completed.stats?.philosophyDominant,
    epi: (completed.endingNarrative || '').slice(0, 700)
  };
  let encoded;
  try {
    encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  } catch {
    encoded = '';
  }
  const url = `${location.origin}${location.pathname}?regne=${encoded}`;

  // Copie dans le presse-papier + UI
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(async () => {
      const { toastSuccess } = await import('./ui-toast.js');
      toastSuccess('Lien copié dans le presse-papier — partage-le pour montrer ton règne.');
    }).catch(async () => {
      const { toastWarn } = await import('./ui-toast.js');
      toastWarn('Impossible de copier — sélectionne et copie le lien manuellement.');
    });
  } else {
    prompt('Copie cette URL pour partager ton règne :', url);
  }
}

function parseSharedUrl() {
  if (typeof location === 'undefined') return null;
  const params = new URLSearchParams(location.search);
  const enc = params.get('regne');
  if (!enc) return null;
  try {
    const json = decodeURIComponent(escape(atob(enc)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function showSharedReign(data) {
  // Nettoie l'URL
  if (history.replaceState) history.replaceState(null, '', location.pathname);
  navigate('shared', data);
}

function escapeHtmlSimple(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showFirstRunBanner() {
  const existing = document.querySelector('.first-run-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.className = 'first-run-banner';
  banner.innerHTML = `
    <div>${(globalThis.__i18n_t ? globalThis.__i18n_t('welcome_first_run') : '👋 Bienvenue dans World State Simulator')} — ${(globalThis.__i18n_t ? globalThis.__i18n_t('api_key_warning') : 'configure une clé API pour commencer.')}<br/>
    <span class="muted small">OpenRouter offers Gemini 2.0 Flash for free (already selected).</span></div>
    <button class="icon-btn" id="banner-close-btn">✕</button>
  `;
  document.body.appendChild(banner);
  banner.querySelector('#banner-close-btn').addEventListener('click', () => banner.remove());
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
