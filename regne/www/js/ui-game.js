// ui-game.js — Panel principal de jeu : événement + 4 choix + jauges

import { generateEvent, HOME_TIPS } from './ai-narrator.js';
import { GAUGES, GAUGE_KEYS, DANGER_THRESHOLD, computeCurrentTitle, getRelicById, pickAdvisorOpinion, describeAttitude, marketBadge } from './game-engine.js';
import { Storage } from './storage.js';
import { escapeHtml, formatTurn, formatYear } from './format.js';
import { t, getLocale } from './i18n.js';

const LOADING_MESSAGES_FR = [
  '⚖ Le conseil se réunit...',
  '📜 Les rumeurs courent dans les couloirs...',
  '🏛 Un événement se prépare...',
  '🕰 Le temps avance...',
  '✉ Un messager arrive de la frontière...',
  '👁 Les espions rapportent...',
  '⚔ Les généraux conspirent à voix basse...',
  '💰 Les marchands comptent leur or...'
];
const LOADING_MESSAGES_EN = [
  '⚖ The council convenes...',
  '📜 Rumors spread through the halls...',
  '🏛 An event is brewing...',
  '🕰 Time marches on...',
  '✉ A messenger arrives from the border...',
  '👁 The spies report in...',
  '⚔ The generals plot in whispers...',
  '💰 Merchants count their coin...'
];
function getLoadingMessages() {
  return getLocale() === 'en' ? LOADING_MESSAGES_EN : LOADING_MESSAGES_FR;
}

let _loaderInterval = null;
function startEventLoader(container) {
  const tip = HOME_TIPS[Math.floor(Math.random() * HOME_TIPS.length)];
  const messages = getLoadingMessages();
  const initial = messages[Math.floor(Math.random() * messages.length)];

  container.querySelector('#event-section').innerHTML = `
    <div class="event-loading-rich">
      <div class="loading-spinner-ring">
        <div class="ring-dot"></div>
        <div class="ring-dot"></div>
        <div class="ring-dot"></div>
      </div>
      <div class="loading-text royal-title" id="loading-msg">${initial}</div>
      <div class="loading-subtip">
        <span>${tip.icon}</span>
        <span>${escapeHtml(tip.text)}</span>
      </div>
    </div>
  `;

  // Cycle des messages toutes les 1,8s
  let i = 0;
  if (_loaderInterval) clearInterval(_loaderInterval);
  _loaderInterval = setInterval(() => {
    const msgs = getLoadingMessages();
    i = (i + 1) % msgs.length;
    const el = container.querySelector('#loading-msg');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = msgs[i];
        el.style.opacity = '1';
      }, 200);
    }
  }, 1800);
}

function stopEventLoader() {
  if (_loaderInterval) { clearInterval(_loaderInterval); _loaderInterval = null; }
}

// Exposé pour app.js : appelé lors d'un navigate hors de 'game' pour éviter
// que le timer continue à tourner sur un DOM remplacé.
export function cleanupGame() {
  stopEventLoader();
  _isGenerating = false;
  _preloaded = null;
  _currentEvent = null;
}

let _onChoiceCallback = null;
let _currentEvent = null;
let _gameState = null;
let _isGenerating = false;
let _preloaded = null;

const URGENCY_BADGES = {
  low:      { label: 'INFO',      class: 'urgency-low',      icon: '📋' },
  medium:   { label: 'DÉCISION',  class: 'urgency-medium',   icon: '🟡' },
  high:     { label: 'IMPORTANT', class: 'urgency-high',     icon: '🟠' },
  critical: { label: 'CRISE',     class: 'urgency-critical', icon: '🔴' }
};

const CATEGORY_ICONS = {
  economie:    '💰',
  militaire:   '⚔',
  social:      '👥',
  diplomatique:'🌍',
  crise:       '⚠',
  opportunite: '✨',
  inattendu:   '❓'
};

const PHILOSOPHY_META = {
  pragmatique:  { icon: '⚙', label: 'Pragmatique' },
  humaniste:    { icon: '❤', label: 'Humaniste' },
  militariste:  { icon: '⚔', label: 'Militariste' },
  diplomatique: { icon: '🤝', label: 'Diplomatique' },
  liberale:     { icon: '🕊', label: 'Libérale' },
  populiste:    { icon: '📢', label: 'Populiste' },
  autocratique: { icon: '👁', label: 'Autocratique' },
  ecologique:   { icon: '🌿', label: 'Écologique' },
  libre:        { icon: '✍', label: 'Libre' }
};

export async function renderGame(container, gameState, onChoice, preloadedEvent = null) {
  _onChoiceCallback = onChoice;
  _gameState = gameState;
  _currentEvent = null;
  _preloaded = preloadedEvent;

  // Titre courant calculé depuis les records (méta-progression cumulée)
  const currentTitle = computeCurrentTitle(Storage.getRecords());
  // Reliques actives sur cette partie (icônes affichées en header)
  const activeRelics = (gameState.activeRelics || []).map(getRelicById).filter(Boolean);
  const dynastyBadge = gameState.dynastyGeneration > 1
    ? `<span class="dynasty-badge" title="Génération ${gameState.dynastyGeneration} de votre lignée">🪶 Gen.${gameState.dynastyGeneration}</span>`
    : '';

  container.innerHTML = `
    <div class="game-screen">
      <header class="game-header">
        <div class="hdr-left">
          <span class="hdr-flag">${escapeHtml(gameState.country.flag)}</span>
          <div class="hdr-text">
            <div class="hdr-country">${escapeHtml(gameState.country.name)}</div>
            <div class="hdr-title-line">
              <span class="hdr-title">${escapeHtml(currentTitle?.label || '')}</span>
              ${dynastyBadge}
            </div>
            <div class="hdr-meta">
              ${escapeHtml(gameState.country.leaderTitle)} ${escapeHtml(gameState.country.leaderName)}
              · ${formatTurn(gameState.turn)} · ${formatYear(gameState.year)}
            </div>
            ${activeRelics.length ? `<div class="hdr-relics">${activeRelics.map((r) => `<span class="hdr-relic" title="${escapeHtml(r.name)} — ${escapeHtml(r.desc)}">${r.icon}</span>`).join('')}</div>` : ''}
          </div>
        </div>
        <div class="hdr-right">
          <button class="icon-btn" id="game-tech-btn" title="${escapeHtml(t('btn_tech'))}">🔬</button>
          <button class="icon-btn" id="game-abandon-btn" title="${escapeHtml(t('btn_abandon'))}">🚪</button>
          <button class="icon-btn" id="game-history-btn" title="${escapeHtml(t('btn_archives'))}">📜</button>
          <button class="icon-btn" id="game-settings-btn" title="${escapeHtml(t('btn_settings_short'))}">⚙</button>
        </div>
      </header>

      <section class="gauges-section" id="gauges-section">
        ${renderGauges(gameState.gauges)}
      </section>

      ${renderNeighborsBar(gameState.neighbors)}
      ${(() => { const mb = marketBadge(gameState.market); return mb ? `<div class="market-bar">📈 ${mb}</div>` : ''; })()}

      <section class="event-section" id="event-section">
        ${renderLoadingEvent()}
      </section>
    </div>
  `;

  container.querySelector('#game-abandon-btn').addEventListener('click', async () => {
    const { confirmDialog } = await import('./ui-toast.js');
    const ok = await confirmDialog(
      `Abandonner le règne de ${gameState.country.leaderTitle} ${gameState.country.leaderName} ? La partie sera perdue, aucun score attribué.`,
      { okLabel: t('btn_abandon') }
    );
    if (ok) {
      Storage.clearCurrentGame();
      document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'setup', payload: { resetGame: true } } }));
    }
  });
  container.querySelector('#game-history-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'history' } }));
  });
  container.querySelector('#game-settings-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'settings' } }));
  });
  container.querySelector('#game-tech-btn')?.addEventListener('click', async () => {
    const m = await import('./ui-tech.js');
    m.openTechModal(_gameState, () => {
      // Après déblocage : on rafraîchit la barre des jauges (treasury débité) ET
      // on signale à app.js de re-synchroniser son _currentGameState (sinon le
      // bonus du nouveau palier ne s'applique pas au prochain tour).
      const cur = Storage.getCurrentGame();
      if (cur) {
        _gameState = cur;
        const gaugesSection = container.querySelector('#gauges-section');
        if (gaugesSection) gaugesSection.innerHTML = renderGauges(cur.gauges);
        document.dispatchEvent(new CustomEvent('regne:state-synced'));
      }
    });
  });

  await loadEvent(container);
}

function renderGauges(gauges) {
  // Layout horizontal compact : 5 colonnes en ligne, icône + valeur + mini-barre verticale
  return `
    <div class="gauges-strip">
      ${GAUGE_KEYS.map((key) => {
        const v = gauges[key];
        const g = GAUGES[key];
        let danger = '';
        if (v <= DANGER_THRESHOLD.low) danger = 'danger-low';
        else if (v >= DANGER_THRESHOLD.high) danger = 'danger-high';
        return `
          <div class="gauge-cell ${danger}" title="${escapeHtml(g.label)}: ${v}/100" style="--g-color:${g.color}">
            <div class="gauge-mini-bar">
              <div class="gauge-mini-fill" style="height:${v}%;"></div>
            </div>
            <div class="gauge-cell-icon">${g.icon}</div>
            <div class="gauge-cell-value">${v}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Bandeau compact des nations voisines (Phase WSS-4) — pastille colorée par attitude.
function renderNeighborsBar(neighbors) {
  if (!neighbors || !neighbors.length) return '';
  return `
    <section class="neighbors-bar" aria-label="Nations voisines">
      ${neighbors.map((n) => {
        const a = n.attitude ?? 50;
        const cls = a >= 60 ? 'attitude-friend' : (a >= 40 ? 'attitude-neutral' : 'attitude-hostile');
        const label = t(describeAttitude(a));
        return `<span class="neighbor-pill ${cls}" title="${escapeHtml(n.regime)} — ${escapeHtml(label)} (${a}/100)">
          <span class="neighbor-dot"></span>
          <span class="neighbor-name">${escapeHtml(n.name)}</span>
        </span>`;
      }).join('')}
    </section>
  `;
}

// Affiche l'opinion d'un conseiller pertinent (Phase 4) selon la jauge la plus impactée
// par les choix proposés. Pure UI — la mise à jour de loyauté se fait après le choix dans app.js.
function renderAdvisorOpinion(gameState, event) {
  if (!gameState?.advisors?.length || !event?.choices?.length) return '';
  // Détermine la jauge la plus exposée par les choix : on additionne les |impacts| par jauge
  const sums = {};
  for (const c of event.choices) {
    const imp = c.hiddenImpacts || c.impacts || {};
    for (const k of GAUGE_KEYS) sums[k] = (sums[k] || 0) + Math.abs(Number(imp[k]) || 0);
  }
  const impacted = Object.entries(sums).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!impacted) return '';
  const expert = gameState.advisors.find((a) => a.status !== 'deceased' && a.expertise === impacted) || gameState.advisors[0];
  if (!expert) return '';
  const opinion = pickAdvisorOpinion(expert, gameState.gauges, impacted);
  const initials = (expert.name || '?').slice(0, 2).toUpperCase();
  const loyaltyTag = expert.loyalty < 30 ? ` <span class="advisor-loyalty-low">${escapeHtml(t('advisor_loyalty_low'))}</span>`
    : (expert.legendarySinceTurn != null && expert.legendarySinceTurn >= 10 ? ` <span class="advisor-legendary">${escapeHtml(t('advisor_legendary'))}</span>` : '');
  return `
    <div class="advisor-opinion">
      <div class="advisor-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
      <div class="advisor-bubble">
        <div class="advisor-bubble-head">${escapeHtml(expert.name)} · ${escapeHtml(expert.title)}${loyaltyTag}</div>
        <div class="advisor-bubble-body">« ${escapeHtml(opinion)} »</div>
      </div>
    </div>
  `;
}

function renderLoadingEvent() {
  // Placeholder vide — le vrai loader animé est lancé par startEventLoader()
  return '<div class="event-loading"><div class="spinner-large"></div></div>';
}

async function loadEvent(container) {
  if (_isGenerating) return;
  _isGenerating = true;

  let result;
  // Préchargé ? Utilise-le immédiatement (zéro attente perçue)
  if (_preloaded?.event) {
    result = _preloaded;
    _preloaded = null;
    _currentEvent = result.event;
    stopEventLoader();
    renderEvent(container, _currentEvent, result.fallback);
    _isGenerating = false;
    return;
  }
  // Sinon : démarre le loader animé pendant qu'on attend
  startEventLoader(container);
  try {
    result = await generateEvent(_gameState);
  } catch (err) {
    const { classifyAIError } = await import('./ai-client.js');
    const cls = classifyAIError(err);
    container.querySelector('#event-section').innerHTML = `
      <div class="event-error">
        <h3>⚠ ${escapeHtml(cls.userMsg)}</h3>
        ${cls.action ? `<p class="muted small">${escapeHtml(cls.action)}</p>` : ''}
        <p class="muted small" style="opacity:0.6;font-size:11px">Détail : ${escapeHtml(String(err.message || err).slice(0, 200))}</p>
        <button class="primary-btn" id="retry-event-btn">Réessayer</button>
        <button class="link-btn" id="event-settings-btn">Vérifier la clé API</button>
      </div>
    `;
    container.querySelector('#retry-event-btn').addEventListener('click', () => loadEvent(container));
    container.querySelector('#event-settings-btn').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'settings' } }));
    });
    _isGenerating = false;
    return;
  }

  _currentEvent = result.event;
  _gameState.totalTokensUsed = (_gameState.totalTokensUsed || 0) + (result.tokensIn || 0) + (result.tokensOut || 0);
  _gameState.totalCostUsd = (_gameState.totalCostUsd || 0) + (result.cost || 0);
  Storage.saveCurrentGame(_gameState);

  stopEventLoader();
  renderEvent(container, _currentEvent, result.fallback);
  _isGenerating = false;
}

function renderEvent(container, event, isFallback) {
  const urgency = URGENCY_BADGES[event.urgency] || URGENCY_BADGES.medium;
  const catIcon = CATEGORY_ICONS[event.category] || '❓';
  const choices = event.choices;

  // Layout 4 choix EN GRILLE 2x2 (compacte). Texte narratif "flavor" sous le titre.
  const choicesHtml = choices.slice(0, 4).map((c, i) => {
    const klass = ['choice-a', 'choice-b', 'choice-c', 'choice-d'][i];
    const philo = PHILOSOPHY_META[c.philosophy] || { icon: '◆', label: c.philosophy || '—' };
    const flavor = c.flavor || c.visibleImpact || c.description || '';
    return `
      <button class="choice-card-compact ${klass}" data-idx="${i}" title="${escapeHtml(c.description || '')}">
        <div class="cc-philo">${philo.icon}</div>
        <div class="cc-label">${escapeHtml(c.label)}</div>
        <div class="cc-flavor">${escapeHtml(flavor)}</div>
      </button>
    `;
  }).join('');

  const freeChoice = choices[4];
  const freeChoiceHtml = freeChoice ? `
    <details class="free-choice-details">
      <summary class="free-choice-summary">
        <span>${escapeHtml(t('free_choice_label'))}</span>
        <span class="free-choice-hint">${escapeHtml(t('free_choice_hint'))}</span>
      </summary>
      <div class="free-choice-area">
        <textarea class="free-choice-textarea" id="free-choice-text" placeholder="${escapeHtml(t('free_choice_placeholder'))}" maxlength="280"></textarea>
        <div class="free-choice-row">
          <span class="char-count" id="char-count">0 / 280</span>
          <button class="secondary-btn" id="submit-free-btn">${escapeHtml(t('free_choice_submit'))}</button>
        </div>
      </div>
    </details>
  ` : '';

  container.querySelector('#event-section').innerHTML = `
    <article class="event-card compact">
      <div class="event-meta">
        <span class="urgency-badge ${urgency.class}">${urgency.icon} ${urgency.label}</span>
        <span class="cat-badge">${catIcon} ${escapeHtml(event.category)}</span>
        ${isFallback ? '<span class="cat-badge fallback">⚠ démo</span>' : ''}
      </div>
      <h2 class="event-title">${escapeHtml(event.title)}</h2>
      <div class="event-context">${escapeHtml(event.context).split(/\n+/).filter(Boolean).map((p) => `<p>${p}</p>`).join('')}</div>

      ${event.advisor || event.advisorQuote ? `
        <details class="advisor-collapse">
          <summary class="advisor-summary">— ${escapeHtml(event.advisor || 'Conseiller')}</summary>
          ${event.advisorQuote ? `<div class="advisor-quote">« ${escapeHtml(event.advisorQuote)} »</div>` : ''}
        </details>
      ` : ''}
      ${renderAdvisorOpinion(_gameState, event)}
    </article>

    <div class="choices-grid">
      ${choicesHtml}
    </div>

    ${freeChoiceHtml}
  `;

  container.querySelectorAll('.choice-card-compact').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.idx);
      handleChoice(container, idx, null);
    });
  });

  const ta = container.querySelector('#free-choice-text');
  const cc = container.querySelector('#char-count');
  const submit = container.querySelector('#submit-free-btn');
  if (ta && cc && submit) {
    ta.addEventListener('input', () => { cc.textContent = `${ta.value.length} / 280`; });
    submit.addEventListener('click', async () => {
      const text = ta.value.trim();
      if (text.length < 10) {
        const { toastWarn } = await import('./ui-toast.js');
        toastWarn(t('free_choice_too_short'));
        return;
      }
      handleChoice(container, 4, text);
    });
  }
}

function handleChoice(container, choiceIndex, customText) {
  import('./audio.js').then((m) => m.playTone('choice')).catch(() => {});
  container.querySelectorAll('.choice-card-compact').forEach((c) => {
    c.disabled = true;
    if (Number(c.dataset.idx) !== choiceIndex) c.classList.add('dimmed');
  });
  const submit = container.querySelector('#submit-free-btn');
  const ta = container.querySelector('#free-choice-text');
  if (submit) submit.disabled = true;
  if (ta) ta.disabled = true;

  if (choiceIndex < 4) {
    const selected = container.querySelector(`[data-idx="${choiceIndex}"]`);
    if (selected) {
      selected.classList.add('selected', 'loading');
      const slot = selected.querySelector('.cc-flavor') || selected.querySelector('.cc-label');
      if (slot) slot.innerHTML = `<span class="spinner"></span> ${escapeHtml(t('decision_in_progress'))}`;
    }
  } else if (submit) {
    submit.innerHTML = `<span class="spinner"></span> ${escapeHtml(t('evaluation'))}`;
  }

  if (_onChoiceCallback) {
    _onChoiceCallback({
      event: _currentEvent,
      choiceIndex,
      customText,
      gaugesBefore: { ..._gameState.gauges }
    });
  }
}
