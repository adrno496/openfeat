// ui-history.js — Archives des règnes passés

import { Storage } from './storage.js';
import { escapeHtml, formatScore, formatTurn, formatRelativeTime, formatEndingType, formatEra } from './format.js';

let _onSelect = null;
let _onBack = null;

const ENDING_ICON = {
  legendary: '✨',
  great: '👑',
  good: '⚔',
  neutral: '⚖',
  bad: '⛓',
  catastrophic: '💀'
};

export async function renderHistory(container, callbacks) {
  _onSelect = callbacks.onSelect;
  _onBack = callbacks.onBack;

  container.innerHTML = `
    <div class="history-screen">
      <header class="panel-header">
        <button class="back-btn" id="history-back">← Retour</button>
        <h2 class="royal-title">📜 CHRONIQUES DES RÈGNES</h2>
      </header>
      <div id="history-list" class="history-list">
        <div class="muted">Chargement…</div>
      </div>
    </div>
  `;

  container.querySelector('#history-back').addEventListener('click', () => _onBack && _onBack());

  const records = Storage.getRecords();
  const games = await Storage.getGameHistory(20);

  const listEl = container.querySelector('#history-list');

  if (games.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📜</div>
        <div>Aucun règne archivé pour le moment.</div>
        <p class="muted">Tes futures parties apparaîtront ici.</p>
      </div>
    `;
    return;
  }

  const recordsHtml = `
    <div class="records-card">
      <div class="record-stat">
        <div class="record-value">${records.totalGames}</div>
        <div class="record-label">Règnes</div>
      </div>
      <div class="record-stat">
        <div class="record-value">${formatScore(records.bestScore)}</div>
        <div class="record-label">Meilleur score</div>
      </div>
      <div class="record-stat">
        <div class="record-value">${records.totalTurns}</div>
        <div class="record-label">Tours joués</div>
      </div>
      <div class="record-stat">
        <div class="record-value">${(records.achievements || []).length}/10</div>
        <div class="record-label">Réalisations</div>
      </div>
    </div>
  `;

  const itemsHtml = games.map((g, i) => {
    const icon = ENDING_ICON[g.endingType] || '📜';
    return `
      <button class="history-item ending-${g.endingType || 'neutral'}" data-id="${escapeHtml(g.id)}">
        <div class="history-item-header">
          <span class="history-rank">#${i + 1}</span>
          <span class="history-ending">${icon} ${escapeHtml(formatEndingType(g.endingType))}</span>
          <span class="history-score">Score ${formatScore(g.finalScore || 0)}</span>
        </div>
        <div class="history-item-name">${escapeHtml(g.country?.flag || '👑')} ${escapeHtml(g.country?.name || 'Anonyme')}</div>
        <div class="history-item-meta">
          ${escapeHtml(g.country?.leaderTitle || '')} ${escapeHtml(g.country?.leaderName || '')}
          · ${formatTurn(g.totalTurns || g.turns?.length || 0)}
          · ${escapeHtml(g.country?.eraLabel || formatEra(g.country?.era) || '')}
        </div>
        <div class="history-item-time">${formatRelativeTime(g.endedAt)}</div>
      </button>
    `;
  }).join('');

  listEl.innerHTML = recordsHtml + itemsHtml;

  listEl.querySelectorAll('.history-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      _onSelect && _onSelect(id);
    });
  });
}

export async function renderHistoryDetail(container, gameId, callbacks) {
  const game = await Storage.getGame(gameId);
  container.innerHTML = `
    <div class="history-detail-screen">
      <header class="panel-header">
        <button class="back-btn" id="detail-back">← Archives</button>
        <h2 class="royal-title">${escapeHtml(game?.country?.name || 'Règne')}</h2>
      </header>
      <div class="history-detail-body">
        ${game ? renderGameDetail(game) : '<div class="empty-state">Règne introuvable</div>'}
      </div>
    </div>
  `;
  container.querySelector('#detail-back').addEventListener('click', () => callbacks.onBack && callbacks.onBack());
}

function renderGameDetail(g) {
  const icon = ENDING_ICON[g.endingType] || '📜';
  const turnsHtml = (g.turns || []).map((t) => `
    <div class="turn-entry">
      <div class="turn-num">${formatTurn(t.turnNumber)}</div>
      <div class="turn-event">${escapeHtml(t.event?.title || '—')}</div>
      <div class="turn-choice">→ ${escapeHtml(t.choiceText || '—')}</div>
    </div>
  `).join('');

  return `
    <div class="detail-summary">
      <div class="detail-flag">${escapeHtml(g.country?.flag || '👑')}</div>
      <div class="detail-ending">${icon} ${escapeHtml(formatEndingType(g.endingType))}</div>
      <div class="detail-stats">
        <span><strong>${formatTurn(g.totalTurns || g.turns?.length || 0)}</strong></span>
        <span>·</span>
        <span><strong>Score ${formatScore(g.finalScore || 0)}</strong></span>
      </div>
    </div>
    <div class="hr-fancy"></div>
    <div class="epitaph-block">
      <div class="epitaph-title">L'ÉPITAPHE</div>
      <div class="epitaph-text">
        ${escapeHtml(g.endingNarrative || '').split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('')}
      </div>
    </div>
    <div class="hr-fancy"></div>
    <div class="turns-history">
      <div class="section-title">JOURNAL DU RÈGNE (${(g.turns || []).length} tours)</div>
      ${turnsHtml || '<p class="muted">Aucun tour enregistré.</p>'}
    </div>
  `;
}
