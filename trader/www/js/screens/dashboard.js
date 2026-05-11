// Dashboard — main overview screen.
import { AppState, startBot } from '../app.js';
import { renderPriceChart } from '../ui/chart.js';
import { toast } from '../ui/toast.js';

let chartCandles = null;
let chartTimer = null;

export function initDashboardScreen() {
  renderShell();
  document.addEventListener('bot-update', (e) => paint(e.detail));
  document.addEventListener('bot-error', (e) => toast(e.detail || 'Erreur bot', 'error'));
}

function renderShell() {
  const root = document.getElementById('screen-dashboard');
  root.innerHTML = `
    <header class="app-header">
      <div class="logo">HL <span>TRADER</span></div>
      <div class="dash-status">
        <span class="net-badge testnet" id="dash-net">TESTNET</span>
        <span><span class="live-dot" id="dash-live"></span><span class="muted" style="font-size:10px" id="dash-clock">--:--</span></span>
      </div>
    </header>
    <div class="body">
      <div class="cb-banner hidden" id="cb-banner">⚠ CIRCUIT BREAKER — Trading suspendu</div>

      <div class="stats-grid">
        <div class="stat-cell">
          <span class="label">Balance</span>
          <span class="value" id="stat-balance">$ —</span>
        </div>
        <div class="stat-cell">
          <span class="label">PnL Jour</span>
          <span class="value" id="stat-pnl">$ —</span>
        </div>
        <div class="stat-cell">
          <span class="label">Positions</span>
          <span class="value" id="stat-pos">—</span>
        </div>
        <div class="stat-cell">
          <span class="label">Statut</span>
          <span class="value" id="stat-status">OFF</span>
        </div>
      </div>

      <div class="ticker" id="ticker"></div>

      <div class="card fg-card">
        <div class="fg-row">
          <span class="label">Fear &amp; Greed</span>
          <span class="fg-value" id="fg-value">—</span>
        </div>
        <div class="fg-bar"><div class="fg-marker" id="fg-marker" style="left:50%"></div></div>
        <div class="fg-row">
          <span class="fg-label" id="fg-label">—</span>
          <span class="fg-contrarian" id="fg-contrarian">—</span>
        </div>
      </div>

      <div class="card chart-card">
        <div class="label">BTC / 1H</div>
        <canvas id="dash-chart"></canvas>
      </div>

      <button class="bot-toggle" id="bot-toggle">DÉMARRER</button>
      <div class="last-update" id="last-update">Dernier tick: —</div>
    </div>
  `;
  document.getElementById('bot-toggle').onclick = onToggleBot;
  startClock();
  loadInitialChart();
}

function startClock() {
  const el = document.getElementById('dash-clock');
  const tick = () => {
    if (!el) return;
    const d = new Date();
    el.textContent = d.toTimeString().slice(0, 8);
  };
  tick();
  setInterval(tick, 1000);
}

async function loadInitialChart() {
  // We delay chart init until the bot has an exchange instance available.
  if (chartTimer) clearInterval(chartTimer);
  chartTimer = setInterval(async () => {
    if (!AppState.bot?.exchange) return;
    try {
      const candles = await AppState.bot.exchange.getCandles('BTC', '1h', 24);
      if (candles?.length) {
        chartCandles = candles;
        renderPriceChart(document.getElementById('dash-chart'), candles);
      }
    } catch {}
  }, 5000);
}

function paint(state) {
  if (!state) return;

  // Network badge
  const config = AppState.config;
  const netBadge = document.getElementById('dash-net');
  if (config && netBadge) {
    netBadge.textContent = config.network.toUpperCase();
    netBadge.className = `net-badge ${config.network}`;
  }

  // Live dot
  const live = document.getElementById('dash-live');
  if (live) live.classList.toggle('offline', !state.running);

  // Stats
  const bal = document.getElementById('stat-balance');
  if (bal) bal.textContent = `$ ${fmt(state.balance, 2)}`;

  const pnl = document.getElementById('stat-pnl');
  if (pnl) {
    pnl.textContent = `${state.pnlToday >= 0 ? '+' : ''}$ ${fmt(state.pnlToday, 2)}`;
    pnl.classList.toggle('green', state.pnlToday > 0);
    pnl.classList.toggle('red', state.pnlToday < 0);
  }

  const pos = document.getElementById('stat-pos');
  if (pos) pos.textContent = state.positions.length;

  const status = document.getElementById('stat-status');
  if (status) {
    status.textContent = state.running ? 'ON' : 'OFF';
    status.classList.toggle('green', state.running);
    status.classList.toggle('red', !state.running);
  }

  // Toggle button
  const tog = document.getElementById('bot-toggle');
  if (tog) {
    tog.classList.toggle('on', state.running);
    tog.textContent = state.running ? 'ARRÊTER' : 'DÉMARRER';
  }

  // Circuit breaker
  document.getElementById('cb-banner')?.classList.toggle('hidden', !state.circuitBreaker);

  // Ticker
  paintTicker(state);

  // F&G
  paintFearGreed(state.fearGreed);

  // Last update
  const lu = document.getElementById('last-update');
  if (lu && state.lastUpdate) {
    lu.textContent = `Dernier tick: ${new Date(state.lastUpdate).toLocaleTimeString()}`;
  }
}

function paintTicker(state) {
  const root = document.getElementById('ticker');
  if (!root) return;
  const config = AppState.config;
  const coins = config?.coins || [];

  root.innerHTML = coins.map((coin) => {
    const sig = state.signals?.[coin];
    const dir = sig?.direction || 'none';
    const price = sig?.price ? `$${fmt(sig.price, 2)}` : '—';
    const badgeClass = dir === 'long' ? 'long' : dir === 'short' ? 'short' : 'none';
    const badgeText = dir === 'long' ? 'LONG' : dir === 'short' ? 'SHORT' : '·';
    return `
      <div class="ticker-item">
        <span class="ticker-coin">${coin}</span>
        <span class="ticker-price">${price}</span>
        <span class="signal-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }).join('');
}

function paintFearGreed(fg) {
  if (!fg) return;
  const v = fg.value ?? 50;
  document.getElementById('fg-value').textContent = v;
  document.getElementById('fg-label').textContent = fg.label || '—';
  document.getElementById('fg-marker').style.left = `${Math.min(100, Math.max(0, v))}%`;

  const contra = document.getElementById('fg-contrarian');
  if (contra) {
    if (v < 35) {
      contra.textContent = 'CONTRARIEN LONG';
      contra.style.color = 'var(--green)';
      contra.style.borderColor = 'var(--green)';
    } else if (v > 75) {
      contra.textContent = 'CONTRARIEN SHORT';
      contra.style.color = 'var(--red)';
      contra.style.borderColor = 'var(--red)';
    } else {
      contra.textContent = 'NEUTRE';
      contra.style.color = 'var(--muted)';
      contra.style.borderColor = 'var(--border)';
    }
  }
}

async function onToggleBot() {
  const bot = AppState.bot;
  if (!bot) {
    await startBot();
    return;
  }
  if (bot.state.running) {
    if (!confirm('Arrêter le bot ?')) return;
    bot.stop();
    toast('Bot arrêté', 'warning');
  } else {
    try {
      await bot.start();
      toast('Bot démarré', 'success');
    } catch (e) {
      toast(`Échec démarrage: ${e.message}`, 'error');
    }
  }
}

function fmt(n, dec = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
