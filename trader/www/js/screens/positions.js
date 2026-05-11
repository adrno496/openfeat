// Positions screen — open positions + history.
import { AppState } from '../app.js';
import { Storage } from '../core/storage.js';
import { toast } from '../ui/toast.js';

let activeTab = 'open';

export function initPositionsScreen() {
  renderShell();
  document.addEventListener('bot-update', () => paint());
}

function renderShell() {
  const root = document.getElementById('screen-positions');
  root.innerHTML = `
    <header class="app-header">
      <div class="logo">POSITIONS</div>
      <span class="muted" style="font-size:10px" id="pos-count">0 ouvertes</span>
    </header>
    <div class="body">
      <div class="tabs">
        <button class="tab active" data-tab="open">Ouvertes</button>
        <button class="tab" data-tab="history">Historique</button>
      </div>
      <div id="pos-list"></div>
    </div>
  `;
  document.querySelectorAll('#screen-positions .tab').forEach((t) => {
    t.onclick = () => {
      activeTab = t.dataset.tab;
      document.querySelectorAll('#screen-positions .tab').forEach((x) => x.classList.toggle('active', x === t));
      paint();
    };
  });
  paint();
}

async function paint() {
  const list = document.getElementById('pos-list');
  if (!list) return;
  const state = AppState.botState || { positions: [] };

  document.getElementById('pos-count').textContent = `${state.positions.length} ouvertes`;

  if (activeTab === 'open') {
    if (!state.positions.length) {
      list.innerHTML = `<div class="empty-state">Aucune position ouverte</div>`;
      return;
    }
    list.innerHTML = state.positions.map(renderPositionCard).join('');
    list.querySelectorAll('[data-close]').forEach((b) => {
      b.onclick = () => closePosition(b.dataset.close);
    });
  } else {
    const trades = await Storage.getTrades();
    if (!trades.length) {
      list.innerHTML = `<div class="empty-state">Aucun trade</div>`;
      return;
    }
    list.innerHTML = trades.slice(0, 50).map(renderHistoryRow).join('');
  }
}

function renderPositionCard(p) {
  const pnlCls = p.pnl > 0 ? 'green' : p.pnl < 0 ? 'red' : '';
  return `
    <div class="pos-card ${p.direction}">
      <div class="pos-head">
        <span class="pos-coin">${p.coin}</span>
        <span class="pos-lev">×${p.leverage}</span>
      </div>
      <div class="pos-grid">
        <div class="pos-cell"><span class="label">Direction</span><span class="value ${p.direction === 'long' ? 'green' : 'red'}">${p.direction.toUpperCase()}</span></div>
        <div class="pos-cell"><span class="label">Taille</span><span class="value">${fmt(p.size, 4)}</span></div>
        <div class="pos-cell"><span class="label">Entrée</span><span class="value">$${fmt(p.entry || p.entryPrice, 2)}</span></div>
        <div class="pos-cell"><span class="label">PnL</span><span class="value ${pnlCls}">${p.pnl >= 0 ? '+' : ''}$${fmt(p.pnl, 2)}</span></div>
        <div class="pos-cell"><span class="label">Stop Loss</span><span class="value red">$${fmt(p.sl, 2)}</span></div>
        <div class="pos-cell"><span class="label">Take Profit</span><span class="value green">$${fmt(p.tp, 2)}</span></div>
      </div>
      <div class="pos-actions">
        <button class="btn btn-danger" data-close="${p.coin}" type="button">Fermer position</button>
      </div>
    </div>
  `;
}

function renderHistoryRow(t) {
  const time = t.openedAt ? new Date(t.openedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  return `
    <div class="hist-row">
      <span class="coin">${t.coin}</span>
      <span class="dir ${t.direction}">${(t.direction || '').toUpperCase()}</span>
      <span class="price">$${fmt(t.entry || t.entryPrice, 2)} · ×${t.leverage || 1}</span>
      <span class="time">${time}</span>
    </div>
  `;
}

async function closePosition(coin) {
  if (!confirm(`Fermer ${coin} au marché ?`)) return;
  try {
    await AppState.bot.closePosition(coin);
    toast(`${coin} fermée`, 'success');
  } catch (e) {
    toast(`Échec: ${e.message}`, 'error');
  }
}

function fmt(n, dec) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
