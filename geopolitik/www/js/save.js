/**
 * Geopolitik — Save/load + utils
 */

const SAVE_KEY = "geopolitik.save.v1";

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      savedAt: Date.now(),
      nation: state.nation.serialize(),
      world: state.world.serialize(),
      events: state.events.serialize(),
      progression: state.progression.serialize(),
      seed: state.seed
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

export function getOfflineTicks(savedAt, tickIntervalMs) {
  const now = Date.now();
  const elapsed = now - savedAt;
  const maxOffline = 12 * 60 * 60 * 1000;
  return Math.floor(Math.min(elapsed, maxOffline) / tickIntervalMs);
}

// PRNG déterministe (mulberry32)
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// Formatters
// ============================================================

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function formatDate(year, month) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatNumber(n, decimals = 0) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

export function formatTreasury(t) {
  if (t >= 1e6) return `${(t / 1e6).toFixed(1)}T$`;
  if (t >= 1e3) return `${(t / 1e3).toFixed(1)}B$`;
  return `${t.toFixed(0)}M$`;
}

export function formatRelation(rel) {
  if (rel >= 80) return { label: "Allié majeur", className: "ally-major" };
  if (rel >= 50) return { label: "Allié", className: "ally" };
  if (rel >= 20) return { label: "Cordial", className: "cordial" };
  if (rel >= -20) return { label: "Neutre", className: "neutral" };
  if (rel >= -50) return { label: "Tendu", className: "tense" };
  if (rel >= -80) return { label: "Hostile", className: "hostile" };
  return { label: "Ennemi juré", className: "enemy" };
}
