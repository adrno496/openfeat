// Signals screen — per-coin strategy breakdown.
import { AppState } from '../app.js';

let activeCoin = null;

const STRAT_LABELS = {
  emaCross: 'EMA CROSS',
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'BOLLINGER',
  vwap: 'VWAP',
  sentiment: 'SENTIMENT',
};

export function initSignalsScreen() {
  renderShell();
  document.addEventListener('bot-update', () => paint());
}

function renderShell() {
  const root = document.getElementById('screen-signals');
  root.innerHTML = `
    <header class="app-header">
      <div class="logo">SIGNAUX</div>
      <span class="muted" style="font-size:10px" id="signals-status">—</span>
    </header>
    <div class="body">
      <div class="coin-tabs" id="coin-tabs"></div>
      <div id="signal-detail"></div>
    </div>
  `;
}

function paint() {
  const state = AppState.botState || { signals: {} };
  const config = AppState.config;
  const coins = config?.coins || [];

  if (!activeCoin || !coins.includes(activeCoin)) {
    activeCoin = coins[0];
  }

  // Tabs
  const tabsEl = document.getElementById('coin-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = coins.map((c) =>
      `<button class="coin-tab ${c === activeCoin ? 'active' : ''}" data-coin="${c}" type="button">${c}</button>`
    ).join('');
    tabsEl.querySelectorAll('.coin-tab').forEach((b) => {
      b.onclick = () => { activeCoin = b.dataset.coin; paint(); };
    });
  }

  const detail = document.getElementById('signal-detail');
  if (!detail) return;
  const sig = state.signals?.[activeCoin];
  if (!sig) {
    detail.innerHTML = `<div class="empty-state">Pas encore de signal pour ${activeCoin || '—'}</div>`;
    return;
  }

  detail.innerHTML = renderConsensus(sig) + renderStrategies(sig);
}

function renderConsensus(sig) {
  const dir = sig.direction;
  const badge = dir === 'long' ? `<span class="signal-badge long">LONG</span>` :
                dir === 'short' ? `<span class="signal-badge short">SHORT</span>` :
                `<span class="signal-badge none">NEUTRE</span>`;
  return `
    <div class="card consensus-card">
      <div class="consensus-head">
        <div>
          <div class="label">Consensus</div>
          ${badge}
        </div>
        <div class="consensus-price">$${fmt(sig.price, 2)}</div>
      </div>
      <div class="scores-row">
        <div class="score-line">
          <span class="lbl long">LONG</span>
          <div class="bar-wrap"><div class="bar-fill long" style="width:${pct(sig.longScore)}"></div></div>
          <span class="val">${(sig.longScore * 100).toFixed(1)}%</span>
        </div>
        <div class="score-line">
          <span class="lbl short">SHORT</span>
          <div class="bar-wrap"><div class="bar-fill short" style="width:${pct(sig.shortScore)}"></div></div>
          <span class="val">${(sig.shortScore * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div class="signal-time">Mis à jour ${sig.updatedAt ? new Date(sig.updatedAt).toLocaleTimeString() : '—'}</div>
    </div>
  `;
}

function renderStrategies(sig) {
  if (!sig.strategies) return '';
  const rows = Object.entries(sig.strategies).map(([k, s]) => {
    const sigCls = s.signal === 'long' ? 'long' : s.signal === 'short' ? 'short' : 'none';
    const sigText = s.signal === 'long' ? 'LONG' : s.signal === 'short' ? 'SHORT' : '·';
    const meta = s.metadata ? Object.entries(s.metadata).map(([mk, mv]) => `${mk}=${mv}`).join(' · ') : '';
    return `
      <div class="strat-row">
        <div class="head">
          <span class="strat-name">${STRAT_LABELS[k] || k.toUpperCase()}</span>
          <span class="signal-badge ${sigCls}">${sigText}</span>
        </div>
        <div class="strat-conf-row">
          <div class="bar-wrap"><div class="bar-fill ${sigCls}" style="width:${pct(s.confidence)}"></div></div>
          <span class="pct">${(s.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="strat-reason">${s.reason || ''}</div>
        ${meta ? `<div class="strat-meta">${meta}</div>` : ''}
      </div>
    `;
  }).join('');
  return `<div class="strat-list">${rows}</div>`;
}

function pct(x) { return Math.min(100, Math.max(0, (x || 0) * 100)) + '%'; }
function fmt(n, dec) { return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—'; }
