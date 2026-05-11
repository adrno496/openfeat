// Settings — full configuration form, restarts the bot on save.
import { AppState, restartBot } from '../app.js';
import { Storage, DEFAULT_CONFIG } from '../core/storage.js';
import { toast } from '../ui/toast.js';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h'];
const STRAT_LABELS = {
  emaCross: 'EMA Cross',
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'Bollinger',
  vwap: 'VWAP',
  sentiment: 'Sentiment',
};

let draft = null; // working copy of config

export function initSettingsScreen() {
  document.addEventListener('app-config-loaded', () => render());
  render();
}

function render() {
  draft = JSON.parse(JSON.stringify(AppState.config || DEFAULT_CONFIG));
  const root = document.getElementById('screen-settings');
  root.innerHTML = `
    <header class="app-header">
      <div class="logo">RÉGLAGES</div>
    </header>
    <div class="body">
      ${networkSection()}
      ${tradingSection()}
      ${riskSection()}
      ${strategiesSection()}
      ${notificationsSection()}
      ${walletSection()}
      <div class="save-bar">
        <button class="btn" id="btn-cancel" type="button">Annuler</button>
        <button class="btn btn-primary" id="btn-save" type="button">Sauvegarder</button>
      </div>
    </div>
  `;
  bind();
}

function networkSection() {
  return `
    <div class="settings-section">
      <h3>Réseau</h3>
      <div class="settings-body">
        <div class="field-row">
          <span class="label">Mode</span>
          <div class="field-row" style="gap:8px">
            <span style="font-size:11px">${draft.network === 'mainnet' ? 'MAINNET' : 'TESTNET'}</span>
            <div class="toggle ${draft.network === 'mainnet' ? 'on' : ''}" data-field="network"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function tradingSection() {
  return `
    <div class="settings-section">
      <h3>Trading</h3>
      <div class="settings-body">
        <div class="field">
          <span class="label">Coins</span>
          <div class="coin-checks" id="coin-checks">
            ${['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'MATIC'].map((c) => `
              <span class="coin-check ${draft.coins.includes(c) ? 'on' : ''}" data-coin="${c}">${c}</span>
            `).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-row">
            <span class="label">Levier</span>
            <span class="value-display" id="lev-val">×${draft.leverage}</span>
          </div>
          <input type="range" min="1" max="${draft.leverageMax || 20}" value="${draft.leverage}" data-field="leverage">
        </div>
        <div class="field-grid">
          <div class="field">
            <span class="label">Capital (USDC)</span>
            <input class="input" type="number" min="10" step="10" value="${draft.capital}" data-field="capital">
          </div>
          <div class="field">
            <span class="label">Timeframe</span>
            <select class="input" data-field="timeframe">
              ${TIMEFRAMES.map((tf) => `<option value="${tf}" ${tf === draft.timeframe ? 'selected' : ''}>${tf}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>
  `;
}

function riskSection() {
  return `
    <div class="settings-section">
      <h3>Risk</h3>
      <div class="settings-body">
        <div class="field-grid">
          <div class="field">
            <span class="label">Risque / trade %</span>
            <input class="input" type="number" min="0.1" max="10" step="0.1" value="${draft.riskPerTradePct}" data-field="riskPerTradePct">
          </div>
          <div class="field">
            <span class="label">Drawdown max %</span>
            <input class="input" type="number" min="1" max="50" step="1" value="${draft.dailyDrawdownLimitPct}" data-field="dailyDrawdownLimitPct">
          </div>
          <div class="field">
            <span class="label">Reward / Risk</span>
            <input class="input" type="number" min="1" max="10" step="0.1" value="${draft.rewardRiskRatio}" data-field="rewardRiskRatio">
          </div>
          <div class="field">
            <span class="label">ATR mult.</span>
            <input class="input" type="number" min="0.5" max="5" step="0.1" value="${draft.atrMultiplier}" data-field="atrMultiplier">
          </div>
          <div class="field">
            <span class="label">Score min.</span>
            <input class="input" type="number" min="0.1" max="1" step="0.01" value="${draft.minConsensusScore}" data-field="minConsensusScore">
          </div>
          <div class="field">
            <span class="label">Stratégies min.</span>
            <input class="input" type="number" min="1" max="6" step="1" value="${draft.minStrategiesAgreeing}" data-field="minStrategiesAgreeing">
          </div>
        </div>
      </div>
    </div>
  `;
}

function strategiesSection() {
  const rows = Object.entries(draft.strategies).map(([k, s]) => `
    <div class="field" data-strat="${k}">
      <div class="field-row">
        <span class="label">${STRAT_LABELS[k] || k}</span>
        <div class="toggle ${s.enabled ? 'on' : ''}" data-strat-toggle="${k}"></div>
      </div>
      <div class="field-row">
        <span class="muted" style="font-size:10px">Poids</span>
        <span class="value-display" data-weight-val="${k}">${(s.weight * 100).toFixed(0)}%</span>
      </div>
      <input type="range" min="0" max="100" step="1" value="${(s.weight * 100).toFixed(0)}" data-strat-weight="${k}">
    </div>
  `).join('');
  return `
    <div class="settings-section">
      <h3>Stratégies</h3>
      <div class="settings-body">${rows}</div>
    </div>
  `;
}

function notificationsSection() {
  const items = [
    ['onTrade', 'Sur trade'],
    ['onSignal', 'Sur signal'],
    ['onError', 'Sur erreur'],
    ['onCircuitBreaker', 'Sur circuit breaker'],
  ];
  return `
    <div class="settings-section">
      <h3>Notifications</h3>
      <div class="settings-body">
        ${items.map(([k, label]) => `
          <div class="field-row">
            <span class="label">${label}</span>
            <div class="toggle ${draft.notifications[k] ? 'on' : ''}" data-notif="${k}"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function walletSection() {
  const wallet = AppState.wallet;
  const masked = wallet ? `${wallet.address.slice(0, 8)}…${wallet.address.slice(-6)}` : '—';
  return `
    <div class="settings-section danger-zone">
      <h3>Wallet</h3>
      <div class="settings-body">
        <div class="field">
          <span class="label">Adresse</span>
          <div class="wallet-display">${masked}</div>
        </div>
        <div class="field-row">
          <button class="btn" id="btn-export" type="button">Exporter clé</button>
          <button class="btn btn-danger" id="btn-reset" type="button">Reset wallet</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Bindings ──────────────────────────────────────────────────────────────
function bind() {
  // Network toggle
  document.querySelector('[data-field="network"]')?.addEventListener('click', (e) => {
    draft.network = draft.network === 'mainnet' ? 'testnet' : 'mainnet';
    if (draft.network === 'mainnet' && !confirm('MAINNET = fonds réels. Confirmer ?')) {
      draft.network = 'testnet';
    }
    render();
  });

  // Coin toggles
  document.querySelectorAll('#coin-checks .coin-check').forEach((el) => {
    el.onclick = () => {
      const c = el.dataset.coin;
      const set = new Set(draft.coins);
      if (set.has(c)) set.delete(c); else set.add(c);
      draft.coins = Array.from(set);
      el.classList.toggle('on');
    };
  });

  // Leverage slider
  const lev = document.querySelector('[data-field="leverage"]');
  if (lev) {
    lev.addEventListener('input', (e) => {
      draft.leverage = parseInt(e.target.value, 10);
      document.getElementById('lev-val').textContent = `×${draft.leverage}`;
    });
  }

  // Generic numeric/select inputs
  document.querySelectorAll('[data-field]').forEach((el) => {
    if (el.dataset.field === 'network' || el.dataset.field === 'leverage') return;
    el.addEventListener('change', (e) => {
      const f = el.dataset.field;
      const v = el.type === 'number' ? parseFloat(el.value) : el.value;
      draft[f] = v;
    });
  });

  // Strategy toggles
  document.querySelectorAll('[data-strat-toggle]').forEach((el) => {
    el.onclick = () => {
      const k = el.dataset.stratToggle;
      draft.strategies[k].enabled = !draft.strategies[k].enabled;
      el.classList.toggle('on', draft.strategies[k].enabled);
    };
  });

  // Strategy weight sliders
  document.querySelectorAll('[data-strat-weight]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const k = el.dataset.stratWeight;
      const v = parseInt(e.target.value, 10);
      draft.strategies[k].weight = v / 100;
      const val = document.querySelector(`[data-weight-val="${k}"]`);
      if (val) val.textContent = `${v}%`;
    });
  });

  // Notification toggles
  document.querySelectorAll('[data-notif]').forEach((el) => {
    el.onclick = () => {
      const k = el.dataset.notif;
      draft.notifications[k] = !draft.notifications[k];
      el.classList.toggle('on', draft.notifications[k]);
    };
  });

  // Wallet danger actions
  document.getElementById('btn-export')?.addEventListener('click', exportKey);
  document.getElementById('btn-reset')?.addEventListener('click', resetWallet);

  // Save / cancel
  document.getElementById('btn-cancel').onclick = () => render();
  document.getElementById('btn-save').onclick = save;
}

async function save() {
  try {
    if (!draft.coins.length) return toast('Au moins un coin requis', 'error');
    await Storage.saveConfig(draft);
    AppState.config = draft;
    toast('Config sauvée. Redémarrage du bot…', 'success');
    await restartBot();
    render();
  } catch (e) {
    toast(`Échec: ${e.message}`, 'error');
  }
}

async function exportKey() {
  if (!confirm('Afficher la clé privée ? Ne la partagez avec personne.')) return;
  const wallet = await Storage.getWallet();
  if (!wallet) return toast('Aucun wallet', 'error');
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <h3>Clé privée</h3>
      <div class="pk-display" style="border-color:var(--red)">${wallet.privateKey}</div>
      <p class="muted" style="margin-top:8px;font-size:10px">Cette clé donne plein accès aux fonds. À conserver hors-ligne.</p>
      <div class="modal-actions">
        <button class="btn" id="modal-close" type="button">Fermer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#modal-close').onclick = () => modal.remove();
}

async function resetWallet() {
  if (!confirm('Effacer le wallet et toutes les données ?')) return;
  if (!confirm('Confirmer définitivement ? Cette action est irréversible.')) return;
  AppState.bot?.stop();
  await Storage.clear();
  toast('Wallet effacé', 'warning');
  setTimeout(() => location.reload(), 500);
}
