// ui-shared.js — Panel pour visualiser un règne reçu via URL partagée

import { escapeHtml, formatScore, formatTurn, formatEndingType } from './format.js';
import { GAUGES, GAUGE_KEYS } from './game-engine.js';

const ENDING_ICONS = {
  legendary: '✨', great: '👑', good: '⚔', neutral: '⚖', bad: '⛓', catastrophic: '💀'
};

export function renderShared(container, data, callbacks) {
  if (!data) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div>Aucun règne à afficher.</div>`;
    return;
  }

  const icon = ENDING_ICONS[data.et] || '👑';
  const gauges = data.g || {};

  container.innerHTML = `
    <div class="shared-screen">
      <header class="panel-header">
        <h2 class="royal-title">🔗 RÈGNE PARTAGÉ</h2>
      </header>
      <div class="shared-body">
        <div class="shared-card">
          <div class="shared-flag">${escapeHtml(data.f || '👑')}</div>
          <div class="shared-name">${escapeHtml(data.n || 'Sans nom')}</div>
          <div class="shared-era">${escapeHtml(data.e || '')}</div>
          <div class="shared-leader">${escapeHtml(data.lt || '')} ${escapeHtml(data.ln || '')}</div>

          <div class="hr-fancy"></div>

          <div class="shared-verdict">
            <div class="shared-verdict-icon">${icon}</div>
            <div class="shared-verdict-label">${escapeHtml(formatEndingType(data.et))}</div>
            <div class="shared-stats">
              <div><strong>${formatScore(data.s || 0)}</strong> points</div>
              <div><strong>${formatTurn(data.t || 0)}</strong></div>
              ${data.ph ? `<div>Philosophie : <strong>${escapeHtml(data.ph.label || data.ph.id || '—')}</strong></div>` : ''}
            </div>
          </div>

          <div class="hr-fancy"></div>

          <div class="shared-gauges">
            <div class="section-title">JAUGES FINALES</div>
            ${GAUGE_KEYS.map((k) => {
              const v = gauges[k] ?? 0;
              const g = GAUGES[k];
              return `
                <div class="gauge-row">
                  <span class="gauge-icon">${g.icon}</span>
                  <span class="gauge-label">${g.label}</span>
                  <div class="gauge-bar"><div class="gauge-fill" style="width:${v}%; background:${g.color};"></div></div>
                  <span class="gauge-value">${v}</span>
                </div>
              `;
            }).join('')}
          </div>

          ${data.epi ? `
            <div class="hr-fancy"></div>
            <div class="epitaph-block">
              <div class="epitaph-title">L'ÉPITAPHE</div>
              <div class="epitaph-text">${escapeHtml(data.epi).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('')}</div>
            </div>
          ` : ''}

          <div class="shared-actions">
            <button class="primary-btn big-btn" id="shared-continue-btn">👑 LANCER MON PROPRE RÈGNE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#shared-continue-btn').addEventListener('click', () => {
    callbacks.onContinue && callbacks.onContinue();
  });
}
