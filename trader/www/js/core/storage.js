// Storage wrapper around @capacitor/preferences with browser fallback.
// Never use localStorage for the wallet — must hit native SharedPreferences on Android.

const HAS_CAP = typeof window !== 'undefined' && window.Capacitor?.isPluginAvailable?.('Preferences');

let Preferences;
if (HAS_CAP) {
  // Loaded from the Capacitor runtime injected on device
  Preferences = window.Capacitor.Plugins.Preferences;
} else {
  // Browser fallback (dev / testing only — NOT secure)
  Preferences = {
    async get({ key }) {
      try { return { value: localStorage.getItem(key) }; } catch { return { value: null }; }
    },
    async set({ key, value }) {
      try { localStorage.setItem(key, value); } catch {}
    },
    async remove({ key }) {
      try { localStorage.removeItem(key); } catch {}
    },
    async clear() {
      try { localStorage.clear(); } catch {}
    },
  };
}

const KEYS = {
  WALLET_PK: 'wallet_pk',
  WALLET_ADDRESS: 'wallet_address',
  NETWORK: 'network',
  CONFIG: 'bot_config',
  TRADES: 'trades_history',
  BOT_STATE: 'bot_state',
};

async function getJSON(key) {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

async function setJSON(key, value) {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export const Storage = {
  async saveWallet(privateKey, address) {
    await Preferences.set({ key: KEYS.WALLET_PK, value: privateKey });
    await Preferences.set({ key: KEYS.WALLET_ADDRESS, value: address });
  },
  async getWallet() {
    const pk = (await Preferences.get({ key: KEYS.WALLET_PK })).value;
    const addr = (await Preferences.get({ key: KEYS.WALLET_ADDRESS })).value;
    if (!pk || !addr) return null;
    return { privateKey: pk, address: addr };
  },
  async clearWallet() {
    await Preferences.remove({ key: KEYS.WALLET_PK });
    await Preferences.remove({ key: KEYS.WALLET_ADDRESS });
  },

  async saveConfig(config) { await setJSON(KEYS.CONFIG, config); },
  async getConfig() {
    const cfg = await getJSON(KEYS.CONFIG);
    return cfg ? mergeWithDefaults(cfg) : null;
  },

  async addTrade(trade) {
    const trades = (await getJSON(KEYS.TRADES)) || [];
    trades.unshift(trade);
    await setJSON(KEYS.TRADES, trades.slice(0, 200));
  },
  async getTrades() {
    return (await getJSON(KEYS.TRADES)) || [];
  },

  async saveBotState(state) {
    // Trim heavy fields before persisting so we don't blow Preferences quota
    const slim = {
      positions: state.positions,
      circuitBreaker: state.circuitBreaker,
      pnlToday: state.pnlToday,
      balance: state.balance,
      // Persisted so the daily PnL survives app restarts within the same UTC
      // day. _rolloverDayIfNeeded() resets these at midnight.
      dayStartBalance: state.dayStartBalance,
      dayKey: state.dayKey,
      fearGreed: state.fearGreed,
      lastUpdate: state.lastUpdate,
      startedAt: state.startedAt,
    };
    await setJSON(KEYS.BOT_STATE, slim);
  },
  async getBotState() {
    return await getJSON(KEYS.BOT_STATE);
  },

  async clear() { await Preferences.clear(); },
};

// Default config — matches the build spec verbatim.
export const DEFAULT_CONFIG = {
  network: 'testnet',
  coins: ['BTC', 'ETH', 'SOL'],
  leverage: 10,
  leverageMax: 20,
  marginMode: 'isolated',
  timeframe: '15m',
  loopIntervalMs: 60000,
  capital: 1000,
  riskPerTradePct: 1.5,
  maxPositions: 3,
  dailyDrawdownLimitPct: 8,
  rewardRiskRatio: 2.0,
  atrMultiplier: 1.5,
  // Net conviction threshold (longNorm − shortNorm) once weights are
  // normalised to 1. 0.40 ≈ 2 strong agreeing strategies with no opposition.
  minConsensusScore: 0.40,
  minStrategiesAgreeing: 2,
  strategies: {
    emaCross: { enabled: true, weight: 0.20, fast: 9, slow: 21, trend: 50 },
    rsi:      { enabled: true, weight: 0.18, period: 14, oversold: 30, overbought: 70 },
    macd:     { enabled: true, weight: 0.18, fast: 12, slow: 26, signal: 9 },
    bollinger:{ enabled: true, weight: 0.17, period: 20, stdDev: 2.0 },
    vwap:     { enabled: true, weight: 0.12, deviationPct: 1.5 },
    sentiment:{ enabled: true, weight: 0.15, longBelow: 35, shortAbove: 75 },
  },
  notifications: {
    onTrade: true,
    onSignal: false,
    onError: true,
    onCircuitBreaker: true,
  },
};

// Deep-merge a stored config with current defaults so newly added fields
// (e.g. a future strategy) don't crash old installs.
function mergeWithDefaults(stored) {
  const out = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  for (const k of Object.keys(stored)) {
    if (k === 'strategies' && typeof stored.strategies === 'object') {
      for (const s of Object.keys(stored.strategies)) {
        out.strategies[s] = { ...(out.strategies[s] || {}), ...stored.strategies[s] };
      }
    } else if (k === 'notifications' && typeof stored.notifications === 'object') {
      out.notifications = { ...out.notifications, ...stored.notifications };
    } else {
      out[k] = stored[k];
    }
  }
  return out;
}
