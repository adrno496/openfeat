// ui-consequence.js — Affichage de la conséquence (streaming) et des impacts

import { GAUGES, GAUGE_KEYS } from './game-engine.js';
import { escapeHtml, formatDelta } from './format.js';

let _onContinueCallback = null;

// Étape 1 : structure rendue avec zone de texte vide. À appeler AVANT le streaming.
// Renvoie une API pour pousser le texte au fur et à mesure et finaliser quand prêt.
export function renderConsequenceShell(container, payload, onContinue) {
  _onContinueCallback = onContinue;
  const { event, choiceIndex, choice, customText } = payload;
  const isCustom = choiceIndex === 4;

  container.innerHTML = `
    <div class="consequence-screen">
      <article class="consequence-card">
        <h2 class="consequence-header royal-title">CONSÉQUENCE DE TA DÉCISION</h2>
        <div class="hr-fancy"></div>

        <div class="event-recap">
          <div class="event-recap-title">"${escapeHtml(event.title)}"</div>
          <div class="event-recap-choice">→ ${escapeHtml(choice?.label || 'Décision libre')}</div>
        </div>

        <div id="custom-eval-slot"></div>

        <div class="consequence-narrative" id="consequence-text">
          <span class="streaming-cursor">▍</span>
        </div>

        <div class="hr-fancy"></div>
        <div class="impacts-section" id="impacts-section" style="opacity:0;">
        </div>

        <div id="fallback-note"></div>

        <div class="consequence-actions" id="continue-actions" style="opacity:0;">
          <button class="primary-btn big-btn" id="continue-btn" disabled>⏳ NARRATION EN COURS…</button>
        </div>
      </article>
    </div>
  `;

  // Custom eval block placeholder (filled later when eval is available)
  if (isCustom) {
    container.querySelector('#custom-eval-slot').innerHTML = `
      <div class="custom-eval-block" id="custom-eval-block">
        <div class="custom-eval-title">🌟 ÉVALUATION EN COURS…</div>
        <div class="custom-eval-text">"${escapeHtml(customText || '')}"</div>
      </div>
    `;
  }

  let buffer = '';
  const textEl = container.querySelector('#consequence-text');
  let firstChunk = true;
  let rafId = null;

  function flushDom() {
    rafId = null;
    textEl.innerHTML = renderParagraphs(buffer) + '<span class="streaming-cursor">▍</span>';
  }

  return {
    appendText(chunk) {
      if (!chunk) return;
      if (firstChunk) {
        textEl.innerHTML = '<span class="streaming-cursor">▍</span>';
        firstChunk = false;
      }
      buffer += chunk;
      // Throttle DOM update : 1 update par frame max (~16ms)
      if (rafId == null) {
        rafId = (typeof requestAnimationFrame !== 'undefined')
          ? requestAnimationFrame(flushDom)
          : setTimeout(flushDom, 16);
      }
    },

    setCustomEvaluation(ev) {
      const block = container.querySelector('#custom-eval-block');
      if (!block) return;
      block.innerHTML = `
        <div class="custom-eval-title">🌟 DÉCISION ORIGINALE</div>
        <div class="custom-eval-quality">
          Qualité : <strong>${ev.quality}/100</strong>
          · Philosophie : ${escapeHtml(ev.philosophy || '—')}
        </div>
        <div class="custom-eval-text">"${escapeHtml(customText || '')}"</div>
      `;
    },

    finalize({ consequence, gaugesBefore, gaugesAfter, isFallback }) {
      // Texte final (au cas où le streaming a manqué la fin)
      if (consequence && consequence.length > buffer.length) {
        buffer = consequence;
      }
      textEl.innerHTML = renderParagraphs(buffer || consequence || '');

      // Impacts
      const impactsEl = container.querySelector('#impacts-section');
      impactsEl.innerHTML = renderImpacts(gaugesBefore, gaugesAfter);
      impactsEl.style.transition = 'opacity 0.6s';
      impactsEl.style.opacity = '1';

      // Animation séquentielle des lignes d'impact
      const rows = container.querySelectorAll('.impact-row');
      rows.forEach((row, i) => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-10px)';
        setTimeout(() => {
          row.style.transition = 'opacity 0.4s, transform 0.4s';
          row.style.opacity = '1';
          row.style.transform = 'translateX(0)';
        }, 150 * i);
      });

      // Fallback note
      if (isFallback) {
        container.querySelector('#fallback-note').innerHTML = '<p class="muted small">⚠ Mode démo : narration simplifiée (l\'IA n\'a pas répondu).</p>';
      }

      // Bouton continuer activé
      const actions = container.querySelector('#continue-actions');
      const btn = container.querySelector('#continue-btn');
      btn.disabled = false;
      btn.innerHTML = '⚔ CONTINUER LE RÈGNE';
      actions.style.transition = 'opacity 0.4s';
      actions.style.opacity = '1';
      btn.addEventListener('click', () => {
        if (_onContinueCallback) _onContinueCallback();
      });
    }
  };
}

// API simple non-streaming (compatibilité ascendante)
export function renderConsequence(container, payload, onContinue) {
  const ctrl = renderConsequenceShell(container, payload, onContinue);
  if (payload.customEvaluation) {
    ctrl.setCustomEvaluation(payload.customEvaluation);
  }
  // Affiche le texte d'un coup, puis finalise
  if (payload.consequence) ctrl.appendText(payload.consequence);
  ctrl.finalize(payload);
  return ctrl;
}

function renderParagraphs(text) {
  if (!text) return '';
  return escapeHtml(text)
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join('');
}

function renderImpacts(gaugesBefore, gaugesAfter) {
  const rows = GAUGE_KEYS.map((k) => {
    const before = gaugesBefore[k];
    const after = gaugesAfter[k];
    const delta = after - before;
    const g = GAUGES[k];
    let arrowCls = 'delta-zero';
    let arrow = '—';
    if (delta > 0) { arrowCls = 'delta-positive'; arrow = delta >= 10 ? '↑↑' : '↑'; }
    else if (delta < 0) { arrowCls = 'delta-negative'; arrow = delta <= -10 ? '↓↓' : '↓'; }
    return `
      <div class="impact-row" data-gauge="${k}" style="--gauge-color:${g.color}">
        <span class="impact-icon">${g.icon}</span>
        <span class="impact-label">${escapeHtml(g.label)}</span>
        <span class="impact-values">
          <span class="impact-before">${before}</span>
          <span class="impact-arrow">→</span>
          <span class="impact-after">${after}</span>
        </span>
        <span class="impact-delta ${arrowCls}">${formatDelta(delta)} ${arrow}</span>
      </div>
    `;
  }).join('');
  return `
    <div class="section-title">IMPACTS</div>
    <div class="impacts-list">${rows}</div>
  `;
}

