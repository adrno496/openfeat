// ui-gameover.js — Écran de fin de règne enrichi (statistiques, arbre, partage, NewGame+)

import { escapeHtml, formatScore, formatTurn, formatEndingType } from './format.js';
import { ACHIEVEMENTS, GAUGES, GAUGE_KEYS, RELICS, getRelicById } from './game-engine.js';
import { t } from './i18n.js';

let _onNewGame = null;
let _onHistory = null;
let _onShare = null;

const ENDING_VISUALS = {
  legendary: { class: 'ending-legendary', icon: '✨', titleKey: 'gameover_legendary_title', subKey: 'gameover_legendary_sub' },
  great:     { class: 'ending-great',     icon: '👑', titleKey: 'gameover_great_title',     subKey: 'gameover_great_sub' },
  good:      { class: 'ending-good',      icon: '⚔', titleKey: 'gameover_good_title',       subKey: 'gameover_good_sub' },
  neutral:   { class: 'ending-neutral',   icon: '⚖', titleKey: 'gameover_neutral_title',    subKey: 'gameover_neutral_sub' },
  bad:       { class: 'ending-bad',       icon: '⛓', titleKey: 'gameover_bad_title',        subKey: 'gameover_bad_sub' },
  catastrophic:{ class:'ending-catastrophic',icon:'💀', titleKey:'gameover_catastrophic_title', subKey:'gameover_catastrophic_sub' }
};

export function renderGameOver(container, payload, callbacks) {
  _onNewGame = callbacks.onNewGame;
  _onHistory = callbacks.onHistory;
  _onShare = callbacks.onShare;

  const { gameState, endingType, gameOverReason, epitaph, score, achievements, stats, completed, isFallback,
    newlyUnlockedRelics = [], dynastyInfo = null, prophecies = [] } = payload;
  const v = ENDING_VISUALS[endingType] || ENDING_VISUALS.neutral;

  const newAchievementsHtml = renderAchievementsList(achievements || []);
  const reasonLine = gameOverReason && gameOverReason !== 'natural'
    ? `<div class="game-over-reason">⚰ ${escapeHtml(gameOverReason)}</div>`
    : '';

  const statsHtml = stats ? renderStatsBlock(stats, gameState) : '';
  const philoRadarHtml = stats ? renderPhilosophyRadar(stats) : '';
  const traitsDriftHtml = renderTraitsDrift(gameState);
  const evolutionHtml = renderEvolutionChart(gameState?.choiceHistory || [], gameState?.startingGauges);
  const decisionTreeHtml = completed && completed.turns?.length ? renderDecisionTree(completed.turns) : '';
  const relicsHtml = renderUnlockedRelics(newlyUnlockedRelics);
  const dynastyHtml = renderDynastyTree(dynastyInfo);
  const propheciesHtml = renderPropheciesEvaluated(prophecies);

  container.innerHTML = `
    <div class="gameover-screen ${v.class}">
      <div class="gameover-card">
        <div class="gameover-icon">${v.icon}</div>
        <h1 class="gameover-title royal-title">${escapeHtml(t(v.titleKey))}</h1>
        <div class="gameover-sub">${escapeHtml(t(v.subKey))}</div>

        <div class="gameover-stats">
          <div class="stat-block">
            <div class="stat-value">${formatTurn(gameState.turn)}</div>
            <div class="stat-label">${escapeHtml(t('gameover_duration'))}</div>
          </div>
          <div class="stat-block">
            <div class="stat-value">${formatScore(score)}</div>
            <div class="stat-label">${escapeHtml(t('gameover_score'))}</div>
          </div>
          <div class="stat-block">
            <div class="stat-value">${formatEndingType(endingType)}</div>
            <div class="stat-label">${escapeHtml(t('gameover_verdict'))}</div>
          </div>
        </div>

        ${reasonLine}

        <div class="hr-fancy"></div>

        <div class="epitaph-block">
          <div class="epitaph-title">${escapeHtml(t('gameover_epitaph'))}</div>
          <div class="epitaph-text">
            ${escapeHtml(epitaph || '').split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('')}
          </div>
        </div>

        ${statsHtml}

        ${evolutionHtml}

        ${philoRadarHtml}

        ${traitsDriftHtml}

        ${decisionTreeHtml}

        ${newAchievementsHtml}

        ${relicsHtml}

        ${dynastyHtml}

        ${propheciesHtml}

        ${isFallback ? `<p class="muted small">${escapeHtml(t('gameover_demo_warning'))}</p>` : ''}

        <div class="gameover-actions">
          <button class="primary-btn" id="new-game-btn">${escapeHtml(t('gameover_btn_new'))}</button>
          ${dynastyInfo && !endingType?.includes('catastrophic') ? `<button class="secondary-btn" id="continue-lineage-btn">${escapeHtml(t('gameover_btn_lineage'))}</button>` : ''}
          ${(achievements || []).length > 0 ? `<button class="secondary-btn" id="newgame-plus-btn">${escapeHtml(t('gameover_btn_newgame_plus'))}</button>` : ''}
          <button class="secondary-btn" id="epopee-btn">${escapeHtml(t('gameover_btn_epopee'))}</button>
          <button class="secondary-btn" id="share-btn">${escapeHtml(t('gameover_btn_share'))}</button>
          <button class="link-btn" id="archives-btn">${escapeHtml(t('gameover_btn_archives'))}</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#new-game-btn').addEventListener('click', () => _onNewGame && _onNewGame('normal'));
  const continueBtn = container.querySelector('#continue-lineage-btn');
  if (continueBtn) continueBtn.addEventListener('click', () => _onNewGame && _onNewGame('lineage'));
  const ngPlus = container.querySelector('#newgame-plus-btn');
  if (ngPlus) ngPlus.addEventListener('click', () => _onNewGame && _onNewGame('plus'));
  container.querySelector('#share-btn').addEventListener('click', () => _onShare && _onShare(completed));
  container.querySelector('#archives-btn').addEventListener('click', () => _onHistory && _onHistory());
  const epBtn = container.querySelector('#epopee-btn');
  if (epBtn) epBtn.addEventListener('click', () => openEpopeeModal(gameState, completed));
}

function renderPropheciesEvaluated(props) {
  if (!props || !props.length) return '';
  const fulfilled = props.filter((p) => p.fulfilled).length;
  return `
    <details class="prophecies-block" ${fulfilled > 0 ? 'open' : ''}>
      <summary class="prophecies-summary">${escapeHtml(t('gameover_prophecies', { fulfilled, total: props.length }))}</summary>
      <ul class="prophecies-list">
        ${props.map((p) => `
          <li class="prophecy-item ${p.fulfilled ? 'fulfilled' : 'unfulfilled'}">
            <span class="prophecy-mark">${p.fulfilled ? '✦' : '○'}</span>
            <span class="prophecy-text">« ${escapeHtml(p.text)} »</span>
            <span class="prophecy-status">${escapeHtml(p.fulfilled ? t('gameover_prophecy_fulfilled') : t('gameover_prophecy_avoided'))}</span>
          </li>
        `).join('')}
      </ul>
    </details>
  `;
}

async function openEpopeeModal(gameState, completed) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay epopee-overlay';
  overlay.innerHTML = `
    <div class="epopee-card">
      <h2 class="royal-title">L'ÉPOPÉE DE ${escapeHtml((gameState.country?.name || '').toUpperCase())}</h2>
      <div class="hr-fancy"></div>
      <div class="epopee-text" id="epopee-stream"><span class="streaming-cursor">▍</span></div>
      <div class="epopee-actions">
        <button class="secondary-btn" id="epopee-copy-btn" disabled>📋 Copier</button>
        <button class="secondary-btn" id="epopee-close-btn">Fermer</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const stream = overlay.querySelector('#epopee-stream');
  let buffer = '';
  const flush = () => { stream.innerHTML = escapeHtml(buffer).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('') + '<span class="streaming-cursor">▍</span>'; };
  let final = '';
  try {
    const { generateEpopee } = await import('./ai-narrator.js');
    const r = await generateEpopee(gameState, completed, (chunk) => { buffer += chunk; flush(); });
    final = r.epopee;
    buffer = final;
    stream.innerHTML = escapeHtml(buffer).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('');
    if (r.fallback) {
      const note = document.createElement('p');
      note.className = 'muted small';
      note.textContent = '⚠ Épopée générée en mode démo (l\'IA n\'a pas répondu)';
      stream.appendChild(note);
    }
    overlay.querySelector('#epopee-copy-btn').disabled = false;
  } catch (err) {
    stream.innerHTML = `<p class="muted">Échec de la génération : ${escapeHtml(String(err?.message || err))}</p>`;
  }
  overlay.querySelector('#epopee-copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(final);
      const { toastSuccess } = await import('./ui-toast.js');
      toastSuccess('Épopée copiée dans le presse-papier.');
    } catch {
      const { toastWarn } = await import('./ui-toast.js');
      toastWarn('Impossible de copier — sélectionne le texte manuellement.');
    }
  });
  overlay.querySelector('#epopee-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function renderUnlockedRelics(ids = []) {
  if (!ids || !ids.length) return '';
  return `
    <div class="relics-block">
      <div class="section-title">${escapeHtml(t('gameover_unlocked_relics'))}</div>
      <div class="relic-list">
        ${ids.map((id) => {
          const r = getRelicById(id);
          if (!r) return '';
          const name = t(r.nameKey);
          const desc = t(r.descKey);
          return `
            <div class="relic-item unlocked" title="${escapeHtml(desc)}">
              <span class="relic-icon">${r.icon}</span>
              <div class="relic-info">
                <div class="relic-name">${escapeHtml(name)}</div>
                <div class="relic-desc">${escapeHtml(desc)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <p class="muted small">${escapeHtml(t('gameover_relics_hint'))}</p>
    </div>
  `;
}

// Radar SVG (octogone) de la distribution des philosophies du règne.
// 8 axes : pragmatique, humaniste, militariste, diplomatique, libérale,
// populiste, autocratique, écologique. Valeurs normalisées 0..1 contre le total.
const PHILO_AXES = [
  { id: 'pragmatique',  label: 'Pragm.' },
  { id: 'humaniste',    label: 'Human.' },
  { id: 'militariste',  label: 'Mil.' },
  { id: 'diplomatique', label: 'Dipl.' },
  { id: 'liberale',     label: 'Lib.' },
  { id: 'populiste',    label: 'Pop.' },
  { id: 'autocratique', label: 'Autoc.' },
  { id: 'ecologique',   label: 'Écol.' }
];

// === ANALYTICS — Graphique d'évolution des 5 jauges (Phase WSS-2) ===
// Line chart SVG normalisé sur la durée du règne. Données : choiceHistory[i].gaugesAfter.
export function renderEvolutionChart(choiceHistory, startingGauges = null) {
  const points = (choiceHistory || []).filter((c) => c?.gaugesAfter);
  if (points.length < 2) return '';
  const W = 480, H = 180, P = 24;
  const data = startingGauges ? [{ gaugesAfter: startingGauges }, ...points] : points;
  const N = data.length;
  const xStep = (W - 2 * P) / Math.max(1, N - 1);

  const lines = GAUGE_KEYS.map((k) => {
    const color = GAUGES[k].color;
    const pts = data.map((d, i) => {
      const x = P + i * xStep;
      const v = Number(d.gaugesAfter?.[k] ?? 50);
      const y = P + (H - 2 * P) * (1 - v / 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>`;
  }).join('');

  // Grille horizontale 0/50/100
  const grid = [0, 50, 100].map((v) => {
    const y = P + (H - 2 * P) * (1 - v / 100);
    return `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="rgba(201,169,97,0.15)" stroke-width="0.6"/>
            <text x="${P - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="#998a76">${v}</text>`;
  }).join('');

  // Légende
  const legend = GAUGE_KEYS.map((k) => `<span class="evo-legend-item"><span class="evo-dot" style="background:${GAUGES[k].color}"></span>${GAUGES[k].icon} ${GAUGES[k].label}</span>`).join('');

  return `
    <div class="evolution-block">
      <div class="section-title">${escapeHtml(t('gameover_evolution', { n: N }))}</div>
      <svg viewBox="0 0 ${W} ${H}" class="evolution-chart" aria-label="Graphique d'évolution des jauges">
        ${grid}
        ${lines}
      </svg>
      <div class="evo-legend">${legend}</div>
    </div>
  `;
}

function renderTraitsDrift(gameState) {
  const init = gameState?.initialTraits;
  const finalT = gameState?.traits;
  if (!init || !finalT) return '';
  const TRAIT_LABELS = {
    pragmatism: { left: 'Pragmatique', right: 'Idéaliste' },
    force:      { left: 'Force',       right: 'Diplomatie' },
    tradition:  { left: 'Tradition',   right: 'Innovation' },
    discretion: { left: 'Discrétion',  right: 'Charisme' }
  };
  const rows = Object.keys(TRAIT_LABELS).map((k) => {
    const a = init[k] ?? 50;
    const b = finalT[k] ?? a;
    const delta = b - a;
    const arrow = Math.abs(delta) >= 25 ? '⤵' : (Math.abs(delta) >= 10 ? '→' : '·');
    const cls = Math.abs(delta) >= 25 ? 'drift-strong' : (Math.abs(delta) >= 10 ? 'drift-mild' : 'drift-none');
    return `<div class="trait-drift-row ${cls}">
      <span class="trait-drift-name">${TRAIT_LABELS[k].left} ↔ ${TRAIT_LABELS[k].right}</span>
      <span class="trait-drift-bar">
        <span class="trait-drift-init" style="left:${a}%"></span>
        <span class="trait-drift-final" style="left:${b}%"></span>
      </span>
      <span class="trait-drift-delta">${a} ${arrow} ${b}</span>
    </div>`;
  }).join('');
  return `
    <div class="traits-drift-block">
      <div class="section-title-small">${escapeHtml(t('gameover_traits_drift'))}</div>
      ${rows}
    </div>
  `;
}

function renderPhilosophyRadar(stats) {
  const breakdown = stats.philosophyBreakdown || [];
  if (!breakdown.length) return '';
  const counts = {};
  let total = 0;
  for (const b of breakdown) {
    counts[b.id] = b.count;
    total += b.count;
  }
  if (total === 0) return '';
  const cx = 110, cy = 110, R = 84;
  const N = PHILO_AXES.length;
  // Points du polygone des valeurs joueur
  const points = PHILO_AXES.map((axis, i) => {
    const ratio = (counts[axis.id] || 0) / Math.max(total, 1);
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const r = R * Math.max(0.05, ratio);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const playerPoly = points.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  // Polygones de référence (cercles concentriques)
  const refRings = [0.25, 0.5, 0.75, 1].map((k) => {
    const ring = PHILO_AXES.map((_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const r = R * k;
      return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${ring}" fill="none" stroke="rgba(201,169,97,0.18)" stroke-width="0.6" />`;
  }).join('');
  const axes = PHILO_AXES.map((axis, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const lx = cx + (R + 14) * Math.cos(angle);
    const ly = cy + (R + 14) * Math.sin(angle);
    return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(201,169,97,0.22)" stroke-width="0.5" />
            <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
              fill="#c9a961" font-size="9" font-family="Cinzel, serif">${axis.label}</text>`;
  }).join('');

  // Portrait politique (templated, sans IA — basé sur la distribution)
  const portrait = generatePoliticalPortrait(breakdown, total);

  return `
    <div class="philo-radar-block">
      <div class="section-title">${escapeHtml(t('gameover_political_portrait'))}</div>
      <div class="philo-radar-content">
        <svg viewBox="0 0 220 220" class="philo-radar-svg" aria-label="Radar des philosophies">
          ${refRings}
          ${axes}
          <polygon points="${playerPoly}" fill="rgba(201,169,97,0.30)" stroke="#c9a961" stroke-width="1.4" />
        </svg>
        <p class="philo-portrait">${escapeHtml(portrait)}</p>
      </div>
    </div>
  `;
}

function generatePoliticalPortrait(breakdown, total) {
  if (!breakdown.length || total === 0) return 'Votre règne n\'a pas encore de signature politique.';
  const top = breakdown[0];
  const second = breakdown[1];
  const ratioTop = top.count / total;
  // Archétypes selon la dominante (et la 2e si dispo)
  const archetypeMap = {
    pragmatique: 'gestionnaire froid',
    humaniste: 'protecteur du peuple',
    militariste: 'chef de guerre',
    diplomatique: 'tisseur d\'alliances',
    liberale: 'réformateur ouvert',
    populiste: 'tribun populaire',
    autocratique: 'monarque inflexible',
    ecologique: 'gardien des terres',
    libre: 'souverain imprévisible',
    incoherente: 'dirigeant insaisissable'
  };
  const arch = archetypeMap[top.id] || 'souverain singulier';
  const accent = second && (second.count / total) > 0.20
    ? ` Vous avez aussi puisé dans la voie ${second.label.toLowerCase()}, nuançant votre signature.`
    : '';
  const dominance = ratioTop > 0.5 ? 'Cette ligne a presque tout dicté.' : (ratioTop > 0.35 ? 'C\'est votre fil conducteur.' : 'Mais sans fanatisme — votre règne fut tissé d\'autres voix.');
  return `Vous avez gouverné comme un ${arch} (${top.count}/${total} décisions ${top.label.toLowerCase()}). ${dominance}${accent}`;
}

// Affiche un arbre de dynastie style parchemin (jusqu'à 5 dernières générations).
function renderDynastyTree(dyn) {
  if (!dyn || !dyn.generations || dyn.generations.length === 0) return '';
  const gens = dyn.generations.slice(-5);
  const total = dyn.length || gens.length;
  return `
    <div class="dynasty-block">
      <div class="section-title">${escapeHtml(t('gameover_dynasty', { name: dyn.name || 'Dynastie' }))}</div>
      <div class="dynasty-tree">
        ${gens.map((g, i) => {
          const ending = g.ending || 'neutral';
          const icon = ENDING_VISUALS[ending]?.icon || '⚖';
          const label = formatEndingType(ending);
          const generationNum = total - gens.length + i + 1;
          return `
            <div class="dynasty-node ending-${ending}">
              <div class="dynasty-gen">Gen. ${generationNum}</div>
              <div class="dynasty-icon">${icon}</div>
              <div class="dynasty-label">${escapeHtml(label)}</div>
              <div class="dynasty-score">${formatScore(g.score || 0)} pts · ${g.turns || 0} tours</div>
            </div>
          `;
        }).join('<div class="dynasty-link">↓</div>')}
      </div>
    </div>
  `;
}

function renderAchievementsList(ids) {
  if (!ids.length) return '';
  return `
    <div class="achievements-block">
      <div class="section-title">${escapeHtml(t('gameover_unlocked_achievements'))}</div>
      <div class="achievement-list">
        ${ids.map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          if (!a) return '';
          return `
            <div class="achievement-item ${a.secret ? 'secret-unlocked' : ''}" title="${escapeHtml(a.description)}">
              <span class="ach-icon">${a.icon}</span>
              <span class="ach-label">${a.secret ? '🔓 ' : ''}${escapeHtml(a.label)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderStatsBlock(stats, gameState) {
  if (!stats) return '';
  const philo = stats.philosophyDominant;
  const big = stats.biggestImpact;
  const ev = stats.gaugesEvolution;

  let evolutionHtml = '';
  if (ev) {
    evolutionHtml = `
      <div class="stats-evolution">
        <div class="stats-evolution-title">ÉVOLUTION DES JAUGES</div>
        <div class="stats-evolution-grid">
          ${GAUGE_KEYS.map((k) => {
            const d = ev[k] || 0;
            const sign = d > 0 ? '+' : '';
            const cls = d > 0 ? 'evo-positive' : (d < 0 ? 'evo-negative' : 'evo-neutral');
            return `<div class="evo-item">${GAUGES[k].icon} <span class="${cls}">${sign}${d}</span></div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="stats-block">
      <div class="section-title">STATISTIQUES DU RÈGNE</div>
      <div class="stats-grid">
        ${philo ? `<div class="stat-card"><div class="stat-card-label">Philosophie dominante</div><div class="stat-card-value">${escapeHtml(philo.label)} (${philo.count})</div></div>` : ''}
        <div class="stat-card"><div class="stat-card-label">Décisions originales</div><div class="stat-card-value">${stats.customCount}</div></div>
        <div class="stat-card"><div class="stat-card-label">Impact moyen / tour</div><div class="stat-card-value">${stats.averageImpact}</div></div>
        ${big ? `<div class="stat-card"><div class="stat-card-label">Tour le plus marquant</div><div class="stat-card-value">Tour ${big.turn} : ${escapeHtml(big.eventTitle)}</div></div>` : ''}
      </div>
      ${evolutionHtml}
      ${stats.flaggedDecisions?.length ? `
        <div class="stats-flagged">
          <div class="stats-evolution-title">DÉCISIONS MARQUANTES (${stats.flaggedDecisions.length})</div>
          <ul class="flagged-list">
            ${stats.flaggedDecisions.slice(0, 5).map((d) => `<li>Tour ${d.turn} : ${escapeHtml(d.label)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

function renderDecisionTree(turns) {
  if (!turns?.length) return '';
  // Top 6 décisions par impact
  const topTurns = [...turns]
    .map((tn) => {
      const before = tn.gaugesBefore || {};
      const after = tn.gaugesAfter || {};
      const totalImpact = GAUGE_KEYS.reduce((s, k) => s + Math.abs((after[k] || 0) - (before[k] || 0)), 0);
      return { ...tn, totalImpact };
    })
    .sort((a, b) => b.totalImpact - a.totalImpact)
    .slice(0, 6)
    .sort((a, b) => a.turnNumber - b.turnNumber);

  return `
    <details class="decision-tree-details">
      <summary class="decision-tree-summary">${escapeHtml(t('gameover_decisions_tree', { n: topTurns.length }))}</summary>
      <div class="decision-tree">
        ${topTurns.map((tn) => {
          const sumDelta = GAUGE_KEYS.reduce((s, k) => s + ((tn.gaugesAfter?.[k] || 0) - (tn.gaugesBefore?.[k] || 0)), 0);
          const cls = sumDelta > 0 ? 'tree-positive' : (sumDelta < 0 ? 'tree-negative' : 'tree-neutral');
          return `
            <div class="tree-node ${cls}">
              <div class="tree-turn">Tour ${tn.turnNumber}</div>
              <div class="tree-event">${escapeHtml(tn.event?.title || '—')}</div>
              <div class="tree-choice">→ ${escapeHtml(tn.choiceText)}</div>
              <div class="tree-impact">Impact total : ${sumDelta >= 0 ? '+' : ''}${sumDelta}</div>
            </div>
          `;
        }).join('')}
      </div>
    </details>
  `;
}
