/**
 * FinMot — Gestion des statistiques
 * Stockage localStorage uniquement (pas de backend pour MVP)
 */

const KEY_STATS = "finmot.stats";
const KEY_LASTGAME = "finmot.lastGame";

const DEFAULT_STATS = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0], // index = nombre d'essais - 1
  lastWinDate: null
};

export function loadStats() {
  try {
    const raw = localStorage.getItem(KEY_STATS);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats) {
  localStorage.setItem(KEY_STATS, JSON.stringify(stats));
}

export function recordGame({ won, attempts, dateString }) {
  const stats = loadStats();
  stats.played += 1;

  if (won) {
    stats.wins += 1;
    stats.distribution[attempts - 1] += 1;

    // Streak management
    const yesterday = getYesterdayString();
    if (stats.lastWinDate === yesterday || stats.lastWinDate === null) {
      stats.currentStreak = (stats.lastWinDate === yesterday)
        ? stats.currentStreak + 1
        : 1;
    } else if (stats.lastWinDate !== dateString) {
      stats.currentStreak = 1;
    }
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }
    stats.lastWinDate = dateString;
  } else {
    stats.currentStreak = 0;
  }

  saveStats(stats);
  return stats;
}

export function loadLastGame() {
  try {
    const raw = localStorage.getItem(KEY_LASTGAME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastGame(game) {
  localStorage.setItem(KEY_LASTGAME, JSON.stringify(game));
}

export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isAlreadyPlayedToday() {
  const last = loadLastGame();
  if (!last) return false;
  return last.date === getTodayString();
}
