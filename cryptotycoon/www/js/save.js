/**
 * Crypto Trader Tycoon — Persistence + utilities
 */

const SAVE_KEY = "cryptotycoon.save.v1";

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      savedAt: Date.now(),
      market: state.market.serialize(),
      portfolio: state.portfolio.serialize(),
      bots: state.bots.serialize(),
      events: state.events.serialize(),
      progression: state.progression.serialize()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Save failed", e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== 1) return null;
    return data;
  } catch (e) {
    console.error("Load failed", e);
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

/**
 * Calcule combien de ticks devraient s'écouler pendant le temps offline.
 * Limité à un cap (e.g. 12h max) pour éviter les abus.
 */
export function getOfflineTicks(savedAt, tickIntervalMs) {
  const now = Date.now();
  const elapsed = now - savedAt;
  const maxOffline = 12 * 60 * 60 * 1000; // 12h
  const capped = Math.min(elapsed, maxOffline);
  return Math.floor(capped / tickIntervalMs);
}

// ============================================================
// Formatters
// ============================================================

export function formatUSD(value, opts = {}) {
  const { compact = true } = opts;
  if (value === undefined || value === null || isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (compact) {
    if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e4)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  }
  if (abs >= 1) {
    return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (abs >= 0.01) return `${sign}$${abs.toFixed(4)}`;
  if (abs >= 0.0001) return `${sign}$${abs.toFixed(6)}`;
  return `${sign}$${abs.toExponential(2)}`;
}

export function formatPrice(price) {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

export function formatUnits(units, symbol) {
  if (units === 0) return `0 ${symbol}`;
  if (units >= 1) return `${units.toFixed(4)} ${symbol}`;
  if (units >= 0.0001) return `${units.toFixed(6)} ${symbol}`;
  return `${units.toExponential(2)} ${symbol}`;
}

export function formatPct(pct, decimals = 2) {
  if (pct === undefined || pct === null || isNaN(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(decimals)}%`;
}
