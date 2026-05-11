// storage.js — localStorage + IndexedDB

const LS_SETTINGS = 'regne_settings';
const LS_CURRENT = 'regne_current_game';
const LS_RECORDS = 'regne_records';
const LS_META = 'regne_meta'; // reliques + dynasties + titres (méta-progression)

const DB_NAME = 'regne_db';
const DB_VERSION = 1;
const STORE_GAMES = 'games';

const DEFAULT_SETTINGS = {
  provider: 'freemium',
  model: 'llama-3.1-8b-instant',
  apiKey: '',
  useStreaming: true,
  totalTokensUsed: 0,
  totalCostUsd: 0
};

const DEFAULT_RECORDS = {
  bestScore: 0,
  bestTurns: 0,
  totalGames: 0,
  totalTurns: 0,
  achievements: [],
  successiveReigns: 0,         // pour NewGame+ et achievement Dynastie
  distinctGenresPlayed: 0,     // pour achievement Polyglotte
  genresPlayed: [],            // liste des genres distincts joués
  lastEndingType: null,
  // Phase 1 : compteurs par type de fin (pour les titres)
  endingTypeCount: { catastrophic: 0, bad: 0, neutral: 0, good: 0, great: 0, legendary: 0 },
  // Phase 1 : reliques cumulées débloquées (sources de vérité = LS_META, miroir ici pour les titres)
  relicsUnlocked: [],
  // Phase 1 : longueur max d'une dynastie continue (générations)
  dynastyMaxLength: 0
};

const DEFAULT_META = {
  unlockedRelics: [],   // ids de RELICS débloquées (cumulatif, jamais retiré)
  activeRelics: [],     // sélection courante (max MAX_ACTIVE_RELICS)
  dynasties: [],        // [{ id, name, country, generations: [{ score, ending, finishedAt, gameId }], length, currentGameId? }]
  currentDynastyId: null
};

let _db = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function safeParse(json, fallback) {
  try {
    if (!json) return fallback;
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Wrapper sûr autour de localStorage.setItem.
// QuotaExceededError (Safari mode privé, quota plein) ou SecurityError (cookies désactivés)
// peuvent crasher l'app. On loggue et on retourne false silencieusement.
let _quotaWarned = false;
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!_quotaWarned) {
      console.error(`[storage] Échec écriture localStorage (${key}):`, err?.name || err);
      _quotaWarned = true;
      try {
        document.dispatchEvent(new CustomEvent('regne:storage-error', { detail: { key, err } }));
      } catch {}
    }
    return false;
  }
}

async function openDB() {
  if (_db) return _db;
  if (!isBrowser() || typeof indexedDB === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        const store = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
        store.createIndex('endedAt', 'endedAt', { unique: false });
        store.createIndex('startedAt', 'startedAt', { unique: false });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode = 'readonly') {
  return db.transaction(STORE_GAMES, mode).objectStore(STORE_GAMES);
}

// --- COMPRESSION (CompressionStream API native, sans dépendance) ---
async function gzipString(str) {
  const blob = new Blob([str], { type: 'application/json' });
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  return await new Response(stream).blob();
}
async function ungzipString(blob) {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

export const Storage = {
  // --- SETTINGS ---
  getSettings() {
    if (!isBrowser()) return { ...DEFAULT_SETTINGS };
    const raw = safeParse(localStorage.getItem(LS_SETTINGS), null);
    return { ...DEFAULT_SETTINGS, ...(raw || {}) };
  },

  saveSettings(s) {
    if (!isBrowser()) return;
    const merged = { ...this.getSettings(), ...s };
    safeSetItem(LS_SETTINGS, JSON.stringify(merged));
  },

  addTokensUsed(tokensIn = 0, tokensOut = 0, costUsd = 0) {
    if (!isBrowser()) return;
    const s = this.getSettings();
    s.totalTokensUsed = (s.totalTokensUsed || 0) + (tokensIn + tokensOut);
    s.totalCostUsd = (s.totalCostUsd || 0) + (costUsd || 0);
    this.saveSettings(s);
  },

  // --- CURRENT GAME ---
  getCurrentGame() {
    if (!isBrowser()) return null;
    return safeParse(localStorage.getItem(LS_CURRENT), null);
  },

  saveCurrentGame(gs) {
    if (!isBrowser()) return;
    if (!gs) {
      try { localStorage.removeItem(LS_CURRENT); } catch {}
      return;
    }
    safeSetItem(LS_CURRENT, JSON.stringify(gs));
  },

  clearCurrentGame() {
    if (!isBrowser()) return;
    localStorage.removeItem(LS_CURRENT);
  },

  // --- HISTORIQUE PARTIES (IndexedDB) ---
  // Les parties sont compressées en gzip via CompressionStream (API native).
  // Format stocké : { id, endedAt, startedAt, summary: {...}, _compressed: Uint8Array }
  // Le summary contient les champs nécessaires pour la liste, les détails sont décompressés à la demande.
  async saveCompletedGame(gameData) {
    const db = await openDB();
    if (!db) return false;
    let stored = gameData;
    if (typeof CompressionStream !== 'undefined' && gameData.turns?.length > 5) {
      try {
        const blob = await gzipString(JSON.stringify(gameData));
        stored = {
          id: gameData.id,
          endedAt: gameData.endedAt,
          startedAt: gameData.startedAt,
          summary: {
            country: gameData.country,
            difficulty: gameData.difficulty,
            genre: gameData.genre,
            finalScore: gameData.finalScore,
            endingType: gameData.endingType,
            totalTurns: gameData.totalTurns,
            achievements: gameData.achievements
          },
          _compressed: blob
        };
      } catch {
        stored = gameData;
      }
    }
    return new Promise((resolve, reject) => {
      const store = tx(db, 'readwrite');
      const req = store.put(stored);
      req.onsuccess = async () => {
        // Phase 8.4 : cap à 50 parties — purge des plus anciennes au-delà.
        try { await this.pruneHistoryToLimit(50); } catch (err) { console.warn('[storage] prune failed:', err); }
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  },

  // Garde au plus `limit` parties dans IndexedDB (les plus anciennes par endedAt sont supprimées).
  async pruneHistoryToLimit(limit = 50) {
    const db = await openDB();
    if (!db) return 0;
    return new Promise((resolve) => {
      const store = tx(db, 'readwrite');
      const all = [];
      const req = store.openCursor();
      req.onsuccess = (ev) => {
        const cursor = ev.target.result;
        if (cursor) {
          all.push({ id: cursor.value.id, endedAt: cursor.value.endedAt || 0 });
          cursor.continue();
        } else {
          if (all.length <= limit) return resolve(0);
          all.sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0));
          const toDelete = all.slice(0, all.length - limit);
          let done = 0;
          for (const item of toDelete) {
            const r = store.delete(item.id);
            r.onsuccess = () => { done++; if (done === toDelete.length) resolve(toDelete.length); };
            r.onerror = () => { done++; if (done === toDelete.length) resolve(toDelete.length); };
          }
        }
      };
      req.onerror = () => resolve(0);
    });
  },

  // Estimation de l'usage de stockage (Mo) — pour affichage settings.
  async getStorageUsage() {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const e = await navigator.storage.estimate();
        return {
          usedMB: Math.round((e.usage || 0) / 1024 / 1024 * 10) / 10,
          quotaMB: Math.round((e.quota || 0) / 1024 / 1024)
        };
      } catch {}
    }
    return { usedMB: null, quotaMB: null };
  },

  async getGameHistory(limit = 20) {
    const db = await openDB();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const store = tx(db);
      const out = [];
      const req = store.openCursor(null, 'prev');
      req.onsuccess = (ev) => {
        const cursor = ev.target.result;
        if (cursor && out.length < limit) {
          // Pour la liste, on n'a pas besoin de décompresser : on renvoie le summary
          const v = cursor.value;
          if (v._compressed && v.summary) {
            out.push({
              id: v.id,
              endedAt: v.endedAt,
              startedAt: v.startedAt,
              ...v.summary,
              _isCompressed: true
            });
          } else {
            out.push(v);
          }
          cursor.continue();
        } else {
          out.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
          resolve(out.slice(0, limit));
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getGame(gameId) {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const store = tx(db);
      const req = store.get(gameId);
      req.onsuccess = async () => {
        const v = req.result;
        if (!v) return resolve(null);
        if (v._compressed) {
          try {
            const json = await ungzipString(v._compressed);
            resolve(JSON.parse(json));
          } catch (err) {
            // Fallback sur le summary
            resolve({ id: v.id, endedAt: v.endedAt, startedAt: v.startedAt, ...v.summary });
          }
        } else {
          resolve(v);
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  async deleteGame(gameId) {
    const db = await openDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const store = tx(db, 'readwrite');
      const req = store.delete(gameId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  // --- RECORDS ---
  getRecords() {
    if (!isBrowser()) return { ...DEFAULT_RECORDS };
    const raw = safeParse(localStorage.getItem(LS_RECORDS), null);
    return { ...DEFAULT_RECORDS, ...(raw || {}) };
  },

  updateRecords(finalScore, endingType, turns = 0, newAchievements = [], extra = {}) {
    if (!isBrowser()) return;
    const r = this.getRecords();
    r.totalGames = (r.totalGames || 0) + 1;
    r.totalTurns = (r.totalTurns || 0) + (turns || 0);
    if ((finalScore || 0) > (r.bestScore || 0)) r.bestScore = finalScore;
    if ((turns || 0) > (r.bestTurns || 0)) r.bestTurns = turns;
    r.lastEndingType = endingType;
    const all = new Set([...(r.achievements || []), ...(newAchievements || [])]);
    r.achievements = Array.from(all);

    // Comptage par type de fin (pour les titres : "1 fin Légendaire", "5 fins Légendaires", etc.)
    if (!r.endingTypeCount || typeof r.endingTypeCount !== 'object') {
      r.endingTypeCount = { catastrophic: 0, bad: 0, neutral: 0, good: 0, great: 0, legendary: 0 };
    }
    if (endingType) {
      r.endingTypeCount[endingType] = (r.endingTypeCount[endingType] || 0) + 1;
    }

    // Suivi du genre joué (pour Polyglotte)
    if (extra.genre && !r.genresPlayed.includes(extra.genre)) {
      r.genresPlayed.push(extra.genre);
      r.distinctGenresPlayed = r.genresPlayed.length;
    }
    // Successive reigns (pour Dynastie via NewGame+)
    if (extra.isNewGamePlus) {
      r.successiveReigns = (r.successiveReigns || 0) + 1;
    } else {
      r.successiveReigns = 1; // reset si nouvelle lignée
    }

    safeSetItem(LS_RECORDS, JSON.stringify(r));
  },

  // --- STREAK (jours consécutifs joués) ---
  // Appelé en fin de partie. Met à jour records.streakDays et records.lastPlayedAt.
  updateStreak() {
    if (!isBrowser()) return 0;
    const r = this.getRecords();
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const last = r.lastPlayedAt || 0;
    const diff = now - last;
    let streakDays = r.streakDays || 0;
    if (!last) streakDays = 1;
    else if (diff < dayMs) streakDays = streakDays || 1; // même jour
    else if (diff < 2 * dayMs) streakDays = streakDays + 1; // jour suivant
    else streakDays = 1;
    r.streakDays = streakDays;
    r.lastPlayedAt = now;
    safeSetItem(LS_RECORDS, JSON.stringify(r));
    return streakDays;
  },

  // --- META (reliques + dynasties) ---
  getMeta() {
    if (!isBrowser()) return { ...DEFAULT_META, dynasties: [] };
    const raw = safeParse(localStorage.getItem(LS_META), null);
    return {
      ...DEFAULT_META,
      ...(raw || {}),
      unlockedRelics: Array.isArray(raw?.unlockedRelics) ? raw.unlockedRelics : [],
      activeRelics: Array.isArray(raw?.activeRelics) ? raw.activeRelics : [],
      dynasties: Array.isArray(raw?.dynasties) ? raw.dynasties : []
    };
  },

  saveMeta(meta) {
    if (!isBrowser()) return;
    const merged = { ...this.getMeta(), ...meta };
    safeSetItem(LS_META, JSON.stringify(merged));
  },

  unlockRelics(ids = []) {
    const m = this.getMeta();
    const existing = new Set(m.unlockedRelics);
    const added = [];
    for (const id of ids) {
      if (!existing.has(id)) {
        existing.add(id);
        added.push(id);
      }
    }
    if (added.length) {
      m.unlockedRelics = Array.from(existing);
      this.saveMeta(m);
      // Miroir dans records pour les titres
      const r = this.getRecords();
      r.relicsUnlocked = m.unlockedRelics;
      safeSetItem(LS_RECORDS, JSON.stringify(r));
    }
    return added;
  },

  setActiveRelics(ids = []) {
    const m = this.getMeta();
    m.activeRelics = (ids || []).slice(0, 2); // MAX_ACTIVE_RELICS = 2
    this.saveMeta(m);
    return m.activeRelics;
  },

  getActiveRelics() {
    return this.getMeta().activeRelics || [];
  },

  // --- DYNASTIES ---
  // Retourne la dynastie courante (continuité) ou null.
  getCurrentDynasty() {
    const m = this.getMeta();
    if (!m.currentDynastyId) return null;
    return m.dynasties.find((d) => d.id === m.currentDynastyId) || null;
  },

  // Crée une nouvelle dynastie à partir d'un règne qui démarre.
  startDynasty(gameState) {
    const m = this.getMeta();
    const id = `dyn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const dyn = {
      id,
      name: gameState?.country?.name || 'Dynastie sans nom',
      country: gameState?.country || null,
      genre: gameState?.genre || null,
      generations: [],
      length: 0,
      startedAt: Date.now(),
      currentGameId: gameState?.gameId || null
    };
    m.dynasties.push(dyn);
    m.currentDynastyId = id;
    // Cap doux : on ne garde que les 30 dernières dynasties pour limiter la croissance.
    if (m.dynasties.length > 30) m.dynasties = m.dynasties.slice(-30);
    this.saveMeta(m);
    return dyn;
  },

  // Continue la dynastie courante avec une nouvelle génération.
  continueDynasty(gameState) {
    const m = this.getMeta();
    const dyn = m.dynasties.find((d) => d.id === m.currentDynastyId);
    if (!dyn) return this.startDynasty(gameState);
    dyn.currentGameId = gameState?.gameId || null;
    this.saveMeta(m);
    return dyn;
  },

  // Enregistre la fin d'un règne dans la dynastie courante.
  recordDynastyGeneration(gameSummary) {
    const m = this.getMeta();
    if (!m.currentDynastyId) return null;
    const dyn = m.dynasties.find((d) => d.id === m.currentDynastyId);
    if (!dyn) return null;
    dyn.generations.push({
      gameId: gameSummary.gameId || null,
      score: gameSummary.finalScore || 0,
      ending: gameSummary.endingType || null,
      turns: gameSummary.totalTurns || 0,
      finishedAt: Date.now()
    });
    dyn.length = dyn.generations.length;
    dyn.currentGameId = null;
    this.saveMeta(m);
    // Mise à jour records.dynastyMaxLength
    const r = this.getRecords();
    if (dyn.length > (r.dynastyMaxLength || 0)) {
      r.dynastyMaxLength = dyn.length;
      safeSetItem(LS_RECORDS, JSON.stringify(r));
    }
    return dyn;
  },

  // Met fin à la dynastie courante (l'utilisateur choisit "Nouvelle dynastie").
  endCurrentDynasty() {
    const m = this.getMeta();
    m.currentDynastyId = null;
    this.saveMeta(m);
  },

  // --- RESET ---
  // Vide tout l'historique des parties (IndexedDB)
  async clearHistory() {
    const db = await openDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const store = tx(db, 'readwrite');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  // Reset COMPLET : vide localStorage + IndexedDB. Réinitialise les paramètres par défaut.
  async clearAll() {
    if (isBrowser()) {
      try { localStorage.removeItem(LS_SETTINGS); } catch (err) { console.warn('[storage] removeItem settings:', err); }
      try { localStorage.removeItem(LS_CURRENT); } catch (err) { console.warn('[storage] removeItem current:', err); }
      try { localStorage.removeItem(LS_RECORDS); } catch (err) { console.warn('[storage] removeItem records:', err); }
      try { localStorage.removeItem(LS_META); } catch (err) { console.warn('[storage] removeItem meta:', err); }
      try {
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('regne_newgame_plus');
      } catch (err) { console.warn('[storage] removeItem session:', err); }
    }
    try {
      await this.clearHistory();
    } catch (err) {
      console.warn('clearHistory failed:', err);
    }
    if (isBrowser()) {
      this.saveSettings(DEFAULT_SETTINGS);
      safeSetItem(LS_RECORDS, JSON.stringify(DEFAULT_RECORDS));
    }
    return true;
  },

  // --- INIT ---
  async init() {
    try {
      await openDB();
    } catch {
      // IndexedDB indisponible — l'app fonctionne quand même sur localStorage
    }
    if (!isBrowser()) return;
    if (!localStorage.getItem(LS_SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(LS_RECORDS)) {
      safeSetItem(LS_RECORDS, JSON.stringify(DEFAULT_RECORDS));
    }
  }
};
