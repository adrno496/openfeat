// game-engine.js — Logique métier : jauges, game over, scoring, achievements

export const GAUGES = {
  economy: {
    label: 'Économie',
    icon: '💰',
    color: '#d4a843',
    description: 'PIB, emploi, finances publiques',
    dangerLow: 'Banqueroute — ton peuple meurt de faim',
    dangerHigh: 'Croissance incontrôlée — bulles spéculatives, inégalités extrêmes'
  },
  military: {
    label: 'Armée',
    icon: '⚔',
    color: '#8b3a3a',
    description: 'Puissance militaire, sécurité intérieure',
    dangerLow: 'Ton pays est envahi ou renversé par un coup d\'état',
    dangerHigh: 'Militarisme total — ton armée te renverse'
  },
  support: {
    label: 'Soutien populaire',
    icon: '👥',
    color: '#4a7a8a',
    description: 'Approbation du peuple, stabilité sociale',
    dangerLow: 'Révolution — le peuple te chasse',
    dangerHigh: 'Culte de la personnalité — dérive autocratique'
  },
  diplomacy: {
    label: 'Diplomatie',
    icon: '🌍',
    color: '#5a8a5a',
    description: 'Relations internationales, alliances',
    dangerLow: 'Isolement total — ton pays est sous embargo',
    dangerHigh: 'Dépendance totale aux puissances étrangères'
  },
  treasury: {
    label: 'Trésor',
    icon: '🏛',
    color: '#9a7a4a',
    description: 'Réserves financières de l\'État',
    dangerLow: 'Défaut souverain — faillite nationale',
    dangerHigh: 'Thésaurisation pathologique — ton peuple privé'
  }
};

export const GAUGE_KEYS = ['economy', 'military', 'support', 'diplomacy', 'treasury'];

export const GAUGE_START = {
  economy: 50,
  military: 50,
  support: 60,
  diplomacy: 50,
  treasury: 45
};

export const DANGER_THRESHOLD = { low: 15, high: 85 };
export const GAME_OVER_THRESHOLD = { low: 0, high: 100 };

export const DIFFICULTY_MODIFIERS = {
  diplomate: { all: 10, label: 'Diplomate', desc: 'Marges confortables, idéal débutant' },
  gouvernant: { all: 0, label: 'Gouvernant', desc: 'Équilibré, expérience standard' },
  conquerant: { all: -10, label: 'Conquérant', desc: 'Tendu dès le départ' },
  tyran: { all: -20, label: 'Tyran', desc: 'Brutal — une jauge démarre à 15' }
};

export function getStartingGauges(difficulty = 'gouvernant', overrides = null) {
  if (overrides && typeof overrides === 'object') {
    const out = {};
    for (const k of GAUGE_KEYS) {
      const v = Number(overrides[k]);
      out[k] = Number.isFinite(v) ? clamp(v, 0, 100) : GAUGE_START[k];
    }
    return out;
  }
  const mod = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.gouvernant;
  const base = {};
  for (const k of GAUGE_KEYS) base[k] = clamp(GAUGE_START[k] + mod.all, 5, 95);
  if (difficulty === 'tyran') {
    // Une jauge aléatoire démarre à 15
    const idx = Math.floor(Math.random() * GAUGE_KEYS.length);
    base[GAUGE_KEYS[idx]] = 15;
  }
  return base;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function checkGameOver(gauges) {
  for (const key of GAUGE_KEYS) {
    const val = gauges[key];
    if (val <= GAME_OVER_THRESHOLD.low) {
      return { over: true, gauge: key, reason: 'low', label: GAUGES[key].dangerLow };
    }
    if (val >= GAME_OVER_THRESHOLD.high) {
      return { over: true, gauge: key, reason: 'high', label: GAUGES[key].dangerHigh };
    }
  }
  return { over: false };
}

export function applyImpact(gauges, impact, activeRelicIds = []) {
  const next = { ...gauges };
  if (!impact || typeof impact !== 'object') return next;
  const floor = getRelicMinFloor(activeRelicIds);
  for (const key of GAUGE_KEYS) {
    const delta = Number(impact[key]);
    if (Number.isFinite(delta)) {
      next[key] = clamp(next[key] + delta, floor, 100);
    }
  }
  return next;
}

// Borne les impacts du choix libre dans une plage raisonnable
export function sanitizeCustomImpact(rawImpact, max = 15) {
  const out = {};
  for (const key of GAUGE_KEYS) {
    const v = Number(rawImpact?.[key]);
    out[key] = Number.isFinite(v) ? clamp(Math.round(v), -max, max) : 0;
  }
  return out;
}

export function calculateScore(turns, gauges, endingType, achievements = [], activeRelicIds = []) {
  const survivalBonus = (turns || 0) * 10;
  const gaugeSum = GAUGE_KEYS.reduce((s, k) => s + (Number(gauges?.[k]) || 0), 0);
  // Le multiplicateur de fin peut être boosté par certaines reliques (Flamme Éternelle).
  const mult = getEndingMultiplier(endingType, activeRelicIds);
  const achievementBonus = (achievements?.length || 0) * 50;
  return Math.round((survivalBonus + gaugeSum) * mult + achievementBonus);
}

export function determineEndingType(gauges, turns) {
  const sum = GAUGE_KEYS.reduce((s, k) => s + (Number(gauges?.[k]) || 0), 0);
  const avg = sum / GAUGE_KEYS.length;
  if (turns >= 50 && avg >= 65) return 'legendary';
  if (turns >= 30 && avg >= 55) return 'great';
  if (turns >= 20 && avg >= 45) return 'good';
  if (turns >= 10) return 'neutral';
  if (turns >= 5) return 'bad';
  return 'catastrophic';
}

export const ACHIEVEMENTS = [
  // PUBLICS
  { id: 'first_reign', label: 'Premier Règne', icon: '👑', secret: false,
    description: 'Achever ton premier règne',
    condition: (s) => (s.totalGames || 0) >= 1 },
  { id: 'survivor_20', label: 'Vingt Saisons', icon: '🌾', secret: false,
    description: 'Régner pendant 20 tours',
    condition: (s) => (s.turn || 0) >= 20 },
  { id: 'survivor_50', label: 'Demi-siècle', icon: '🏛', secret: false,
    description: 'Régner pendant 50 tours',
    condition: (s) => (s.turn || 0) >= 50 },
  { id: 'balanced', label: 'Équilibriste', icon: '⚖', secret: false,
    description: 'Toutes les jauges entre 30 et 70 simultanément',
    condition: (s) => GAUGE_KEYS.every((k) => s.gauges?.[k] >= 30 && s.gauges?.[k] <= 70) },
  { id: 'military_genius', label: 'Génie Militaire', icon: '⚔', secret: false,
    description: 'Atteindre 80 en armée',
    condition: (s) => (s.gauges?.military || 0) >= 80 },
  { id: 'beloved', label: 'Bien-aimé(e)', icon: '❤', secret: false,
    description: 'Atteindre 80 en soutien populaire',
    condition: (s) => (s.gauges?.support || 0) >= 80 },
  { id: 'rich', label: 'Trésor Légendaire', icon: '💎', secret: false,
    description: 'Atteindre 80 en trésor',
    condition: (s) => (s.gauges?.treasury || 0) >= 80 },
  { id: 'diplomat', label: 'Grand Diplomate', icon: '🌍', secret: false,
    description: 'Atteindre 80 en diplomatie',
    condition: (s) => (s.gauges?.diplomacy || 0) >= 80 },
  { id: 'free_writer', label: 'Voix Libre', icon: '✍', secret: false,
    description: 'Soumettre 5 décisions originales',
    condition: (s, ch = []) => ch.filter((c) => c?.isCustom).length >= 5 },
  { id: 'legend', label: 'Légende', icon: '🌟', secret: false,
    description: 'Atteindre 5000 points en un seul règne',
    condition: (s) => (s.score || 0) >= 5000 },

  // SECRETS — non révélés tant que pas débloqués
  { id: 'voice_of_people', label: 'Voix du peuple', icon: '📢', secret: true,
    description: '10 choix populiste ou humaniste dans un même règne',
    condition: (s, ch = []) => ch.filter((c) => ['populiste', 'humaniste'].includes(c.philosophy)).length >= 10 },
  { id: 'iron_fist', label: 'Main de fer', icon: '🤜', secret: true,
    description: '10 choix autocratique ou militariste dans un même règne',
    condition: (s, ch = []) => ch.filter((c) => ['autocratique', 'militariste'].includes(c.philosophy)).length >= 10 },
  { id: 'pacifist', label: 'Pacifiste', icon: '🕊', secret: true,
    description: '0 choix militariste sur 30 tours',
    condition: (s, ch = []) => (s.turn || 0) >= 30 && ch.filter((c) => c.philosophy === 'militariste').length === 0 },
  { id: 'crisis_master', label: 'Maître des crises', icon: '🌪', secret: true,
    description: 'Résoudre 5 événements critiques en gardant les jauges hors zone rouge',
    condition: (s, ch = []) => ch.filter((c) => c.eventCategory === 'crise' && Object.values(c.gaugesAfter || {}).every((v) => v > 20)).length >= 5 },
  { id: 'visionary', label: 'Visionnaire', icon: '🔮', secret: true,
    description: '30 tours sans déclencher d\'event de catégorie "crise"',
    condition: (s, ch = []) => (s.turn || 0) >= 30 && ch.filter((c) => c.eventCategory === 'crise').length === 0 },
  { id: 'phoenix', label: 'Phénix', icon: '🔥', secret: true,
    description: 'Remonter une jauge de moins de 5 à plus de 50',
    condition: (s, ch = []) => {
      const trail = {};
      for (const c of ch) {
        for (const k of GAUGE_KEYS) {
          const before = c.gaugesBefore?.[k] ?? 50;
          const after = c.gaugesAfter?.[k] ?? before;
          if (!trail[k]) trail[k] = { wasLow: false, recovered: false };
          if (after < 5) trail[k].wasLow = true;
          if (trail[k].wasLow && after >= 50) trail[k].recovered = true;
        }
      }
      return Object.values(trail).some((t) => t.recovered);
    } },
  { id: 'polyglot', label: 'Polyglotte', icon: '🌐', secret: true,
    description: 'Achever des règnes dans 5 genres différents',
    condition: (s) => (s.distinctGenresPlayed || 0) >= 5 },
  { id: 'dynasty', label: 'Dynastie', icon: '🏰', secret: true,
    description: '3 règnes successifs (NewGame+)',
    condition: (s) => (s.successiveReigns || 0) >= 3 }
];

export function evaluateAchievements(state, choiceHistory = []) {
  return ACHIEVEMENTS.filter((a) => {
    try { return a.condition(state, choiceHistory); } catch { return false; }
  }).map((a) => a.id);
}

// --- RELIQUES (méta-progression entre parties) ---
// Débloquées en fin de règne selon des conditions sur les stats du règne.
// Le joueur peut activer jusqu'à MAX_ACTIVE_RELICS reliques au début d'une nouvelle partie.
// Effets appliqués aux jauges de départ via applyRelicEffects().

export const MAX_ACTIVE_RELICS = 2;

export const RELICS = [
  {
    id: 'iron_crown',
    nameKey: 'relic_iron_crown_name',
    descKey: 'relic_iron_crown_desc',
    name: 'Couronne de Fer', // fallback si i18n indisponible
    icon: '👑',
    desc: '+5 Armée au départ',
    effect: { gaugeBonus: { military: 5 } },
    unlockCondition: (stats) => ['great', 'legendary'].includes(stats.endingType)
  },
  {
    id: 'golden_quill',
    nameKey: 'relic_golden_quill_name',
    descKey: 'relic_golden_quill_desc',
    name: 'Plume d\'Or',
    icon: '🪶',
    desc: '+5 Économie au départ',
    effect: { gaugeBonus: { economy: 5 } },
    unlockCondition: (stats) => (stats.totalTurns || 0) >= 30
  },
  {
    id: 'mercy_tome',
    nameKey: 'relic_mercy_tome_name',
    descKey: 'relic_mercy_tome_desc',
    name: 'Tome de Clémence',
    icon: '📖',
    desc: 'Les jauges ne tombent pas sous 5',
    effect: { minFloor: 5 },
    unlockCondition: (stats) => stats.philosophyDominantId === 'humaniste'
  },
  {
    id: 'war_banner',
    nameKey: 'relic_war_banner_name',
    descKey: 'relic_war_banner_desc',
    name: 'Bannière de Guerre',
    icon: '🚩',
    desc: 'Armée commence à 80',
    effect: { gaugeOverride: { military: 80 } },
    unlockCondition: (stats) => (stats.militaryChoices || 0) >= 10
  },
  {
    id: 'traders_ring',
    nameKey: 'relic_traders_ring_name',
    descKey: 'relic_traders_ring_desc',
    name: 'Anneau du Marchand',
    icon: '💍',
    desc: 'Trésor commence à 75',
    effect: { gaugeOverride: { treasury: 75 } },
    unlockCondition: (stats) => (stats.economyChoices || 0) >= 10
  },
  {
    id: 'shadow_crown',
    nameKey: 'relic_shadow_crown_name',
    descKey: 'relic_shadow_crown_desc',
    name: 'Couronne de l\'Ombre',
    icon: '🜲',
    desc: 'Bonus +3 sur toutes les jauges',
    effect: { gaugeBonus: { economy: 3, military: 3, support: 3, diplomacy: 3, treasury: 3 } },
    unlockCondition: (stats) => (stats.customCount || 0) >= 15
  },
  {
    id: 'eternal_flame',
    nameKey: 'relic_eternal_flame_name',
    descKey: 'relic_eternal_flame_desc',
    name: 'Flamme Éternelle',
    icon: '🔥',
    desc: 'Les fins Légendaires donnent ×4 au lieu de ×3',
    effect: { legendaryMultiplier: 4 },
    unlockCondition: (stats) => (stats.totalLegendary || 0) >= 1
  },
  {
    id: 'black_seal',
    nameKey: 'relic_black_seal_name',
    descKey: 'relic_black_seal_desc',
    name: 'Sceau Noir',
    icon: '🜨',
    desc: 'Bonus +10 partout (déblocage rare)',
    effect: { gaugeBonus: { economy: 10, military: 10, support: 10, diplomacy: 10, treasury: 10 } },
    unlockCondition: (stats) => stats.endingType === 'legendary'
  }
];

export function getRelicById(id) {
  return RELICS.find((r) => r.id === id) || null;
}


// Applique les effets des reliques actives aux jauges de départ.
// Ordre : override > bonus. Retourne un nouvel objet (immuable).
export function applyRelicEffects(startingGauges, activeRelicIds = []) {
  const out = { ...startingGauges };
  const relics = (activeRelicIds || []).map(getRelicById).filter(Boolean);
  // 1) Overrides (forcent une valeur exacte)
  for (const r of relics) {
    const ov = r.effect?.gaugeOverride;
    if (ov) for (const k of GAUGE_KEYS) if (Number.isFinite(ov[k])) out[k] = clamp(ov[k], 5, 95);
  }
  // 2) Bonus additifs
  for (const r of relics) {
    const bn = r.effect?.gaugeBonus;
    if (bn) for (const k of GAUGE_KEYS) if (Number.isFinite(bn[k])) out[k] = clamp(out[k] + bn[k], 5, 95);
  }
  return out;
}

// Évalue quelles reliques sont nouvellement débloquées par le règne qui vient de finir.
// `stats` est le résultat enrichi du computeReignStats + endingType + totaux records.
export function evaluateRelicUnlocks(stats, alreadyUnlocked = []) {
  const owned = new Set(alreadyUnlocked || []);
  const newly = [];
  for (const r of RELICS) {
    if (owned.has(r.id)) continue;
    try {
      if (r.unlockCondition(stats)) newly.push(r.id);
    } catch (err) {
      console.warn('[relics] unlock condition failed:', r.id, err);
    }
  }
  return newly;
}

// Le multiplicateur de fin Légendaire peut être boosté par la relique Flamme Éternelle.
export function getEndingMultiplier(endingType, activeRelicIds = []) {
  const base = { legendary: 3.0, great: 2.0, good: 1.5, neutral: 1.0, bad: 0.7, catastrophic: 0.3 };
  const relics = (activeRelicIds || []).map(getRelicById).filter(Boolean);
  let legendaryMult = base.legendary;
  for (const r of relics) {
    if (r.effect?.legendaryMultiplier && r.effect.legendaryMultiplier > legendaryMult) {
      legendaryMult = r.effect.legendaryMultiplier;
    }
  }
  return endingType === 'legendary' ? legendaryMult : (base[endingType] ?? 1.0);
}

// Plancher minimum sur les jauges (Tome de Clémence)
export function getRelicMinFloor(activeRelicIds = []) {
  let floor = 0;
  for (const r of (activeRelicIds || []).map(getRelicById).filter(Boolean)) {
    if (Number.isFinite(r.effect?.minFloor) && r.effect.minFloor > floor) floor = r.effect.minFloor;
  }
  return floor;
}

// --- TITRES (progression méta cumulée) ---
// 20 titres déclenchés par les stats globales (records) — chaque palier remplace le précédent.
// Le titre courant est calculé à la volée via computeCurrentTitle(records).
export const TITLES = [
  { id: 'novice',          label: 'Apprenti Gouvernant',  rank: 1,  condition: () => true },
  { id: 'reign_3',         label: 'Régent Confirmé',      rank: 2,  condition: (r) => (r.totalGames || 0) >= 3 },
  { id: 'reign_10',        label: 'Seigneur Établi',      rank: 3,  condition: (r) => (r.totalGames || 0) >= 10 },
  { id: 'reign_25',        label: 'Maître des Couronnes', rank: 4,  condition: (r) => (r.totalGames || 0) >= 25 },
  { id: 'good_ending',     label: 'Bon Souverain',        rank: 5,  condition: (r) => (r.endingTypeCount?.good || 0) >= 1 },
  { id: 'great_ending',    label: 'Souverain Glorieux',   rank: 6,  condition: (r) => (r.endingTypeCount?.great || 0) >= 1 },
  { id: 'legendary_1',     label: 'Stratège Impérial',    rank: 7,  condition: (r) => (r.endingTypeCount?.legendary || 0) >= 1 },
  { id: 'survivor_50',     label: 'Témoin du Demi-siècle', rank: 8, condition: (r) => (r.bestTurns || 0) >= 50 },
  { id: 'polyglot',        label: 'Voyageur des Âges',    rank: 9,  condition: (r) => (r.distinctGenresPlayed || 0) >= 5 },
  { id: 'dynasty_3',       label: 'Fondateur de Dynastie', rank: 10, condition: (r) => (r.dynastyMaxLength || 0) >= 3 },
  { id: 'reign_50',        label: 'Empereur du Souvenir', rank: 11, condition: (r) => (r.totalGames || 0) >= 50 },
  { id: 'legendary_3',     label: 'Architecte des Âges',  rank: 12, condition: (r) => (r.endingTypeCount?.legendary || 0) >= 3 },
  { id: 'achievements_10', label: 'Collectionneur d\'Honneurs', rank: 13, condition: (r) => (r.achievementsUnlocked?.length || r.achievements?.length || 0) >= 10 },
  { id: 'turns_500',       label: 'Tisseur de Siècles',   rank: 14, condition: (r) => (r.totalTurns || 0) >= 500 },
  { id: 'relic_3',         label: 'Gardien des Reliques', rank: 15, condition: (r) => (r.relicsUnlocked?.length || 0) >= 3 },
  { id: 'dynasty_5',       label: 'Patriarche Éternel',   rank: 16, condition: (r) => (r.dynastyMaxLength || 0) >= 5 },
  { id: 'legendary_5',     label: 'Légende Vivante',      rank: 17, condition: (r) => (r.endingTypeCount?.legendary || 0) >= 5 },
  { id: 'relic_all',       label: 'Maître des Reliques',  rank: 18, condition: (r) => (r.relicsUnlocked?.length || 0) >= RELICS.length },
  { id: 'reign_100',       label: 'Souverain Centenaire', rank: 19, condition: (r) => (r.totalGames || 0) >= 100 },
  { id: 'legendary_10',    label: 'Éternel',              rank: 20, condition: (r) => (r.endingTypeCount?.legendary || 0) >= 10 }
];

// Retourne le titre actuel (le plus haut rang dont la condition est satisfaite).
export function computeCurrentTitle(records = {}) {
  let current = TITLES[0];
  for (const t of TITLES) {
    try {
      if (t.condition(records)) current = t;
    } catch (err) {
      console.warn('[titles] condition failed:', t.id, err);
    }
  }
  return current;
}

// Retourne le prochain palier à atteindre, et la "progression" (0..1) si calculable.
export function computeNextTitle(records = {}) {
  const cur = computeCurrentTitle(records);
  const next = TITLES.find((t) => t.rank === cur.rank + 1);
  if (!next) return { next: null, progress: 1 };
  return { next, progress: null }; // pas de barre fine ici, on affiche juste le palier
}

// --- STATISTIQUES DE RÈGNE ---
export const PHILOSOPHY_LABELS = {
  pragmatique: 'Pragmatique',
  humaniste: 'Humaniste',
  militariste: 'Militariste',
  diplomatique: 'Diplomatique',
  liberale: 'Libérale',
  populiste: 'Populiste',
  autocratique: 'Autocratique',
  ecologique: 'Écologique',
  libre: 'Libre',
  incoherente: 'Incohérente'
};

export function computeReignStats(choiceHistory = [], finalGauges = null, startingGauges = null) {
  const philoCount = {};
  let customCount = 0;
  let biggestImpactTurn = null;
  let biggestImpactValue = 0;
  let biggestImpactSign = 0;
  let totalImpactDelta = 0;

  for (const c of choiceHistory) {
    const phi = c.philosophy || 'pragmatique';
    philoCount[phi] = (philoCount[phi] || 0) + 1;
    if (c.isCustom) customCount++;

    const before = c.gaugesBefore || {};
    const after = c.gaugesAfter || {};
    const delta = GAUGE_KEYS.reduce((sum, k) => sum + Math.abs((after[k] || 0) - (before[k] || 0)), 0);
    totalImpactDelta += delta;
    if (delta > biggestImpactValue) {
      biggestImpactValue = delta;
      biggestImpactTurn = c;
      const positiveSum = GAUGE_KEYS.reduce((s, k) => s + ((after[k] || 0) - (before[k] || 0)), 0);
      biggestImpactSign = positiveSum > 0 ? 1 : (positiveSum < 0 ? -1 : 0);
    }
  }

  const philosophyDominant = Object.entries(philoCount).sort((a, b) => b[1] - a[1])[0];
  const flaggedDecisions = choiceHistory.filter((c) => c.flagged).map((c) => ({ turn: c.turn, label: c.flagged }));

  // Évolution globale des jauges depuis le départ
  let gaugesEvolution = null;
  if (finalGauges && startingGauges) {
    gaugesEvolution = {};
    for (const k of GAUGE_KEYS) {
      gaugesEvolution[k] = (finalGauges[k] || 0) - (startingGauges[k] || 0);
    }
  }

  return {
    totalDecisions: choiceHistory.length,
    customCount,
    philosophyDominant: philosophyDominant ? { id: philosophyDominant[0], label: PHILOSOPHY_LABELS[philosophyDominant[0]] || philosophyDominant[0], count: philosophyDominant[1] } : null,
    philosophyBreakdown: Object.entries(philoCount)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ id, label: PHILOSOPHY_LABELS[id] || id, count: n })),
    biggestImpact: biggestImpactTurn ? {
      turn: biggestImpactTurn.turn,
      eventTitle: biggestImpactTurn.eventTitle,
      choiceLabel: biggestImpactTurn.choiceLabel,
      delta: biggestImpactValue,
      sign: biggestImpactSign
    } : null,
    flaggedDecisions,
    gaugesEvolution,
    averageImpact: choiceHistory.length ? Math.round(totalImpactDelta / choiceHistory.length) : 0
  };
}

// --- TRAITS DU JOUEUR ---
export const PLAYER_TRAITS = [
  { id: 'pragmatism', label: 'Pragmatisme ↔ Idéalisme', leftLabel: 'Pragmatique', rightLabel: 'Idéaliste', desc: 'Réalisme froid vs valeurs morales' },
  { id: 'force', label: 'Force ↔ Diplomatie', leftLabel: 'Force', rightLabel: 'Diplomatie', desc: 'Confrontation vs négociation' },
  { id: 'tradition', label: 'Tradition ↔ Innovation', leftLabel: 'Tradition', rightLabel: 'Innovation', desc: 'Conservatisme vs réforme' },
  { id: 'discretion', label: 'Discrétion ↔ Charisme', leftLabel: 'Discrétion', rightLabel: 'Charisme', desc: 'Arrière-plan vs lumière' }
];

export function defaultTraits() {
  return PLAYER_TRAITS.reduce((o, t) => { o[t.id] = 50; return o; }, {});
}

// === ARBRE R&D — BRANCHES DE DÉVELOPPEMENT (Phase WSS-6) ===
// 4 branches × 4 paliers. Coût croissant en treasury. Bonus passifs appliqués à chaque tour.
// Labels adaptés selon le genre du règne pour l'immersion.
export const TECH_BRANCHES = [
  {
    id: 'economy',
    icon: '💰',
    baseLabel: 'Économie',
    labelByGenre: {
      medieval: 'Guildes',
      moyen_age_eu: 'Guildes',
      antique: 'Voies Marchandes',
      antiquite_rome: 'Voies Marchandes',
      contemporain: 'Marchés Financiers',
      cyberpunk: 'Crypto-Marchés',
      futur_proche: 'Hyper-Marchés',
      fantasy: 'Bourses Marchandes',
      post_apo: 'Trocs Organisés'
    },
    tiers: [
      { tier: 1, cost: 8,  bonusEvery: 3, bonus: { economy: +1 }, label: 'Atelier' },
      { tier: 2, cost: 15, bonusEvery: 3, bonus: { economy: +1, treasury: +1 }, label: 'Comptoir' },
      { tier: 3, cost: 25, bonusEvery: 2, bonus: { economy: +2, treasury: +1 }, label: 'Marché' },
      { tier: 4, cost: 40, bonusEvery: 2, bonus: { economy: +2, treasury: +2 }, label: 'Bourse' }
    ]
  },
  {
    id: 'military',
    icon: '⚔',
    baseLabel: 'Militaire',
    labelByGenre: {
      medieval: 'Chevalerie',
      moyen_age_eu: 'Chevalerie',
      antique: 'Légions',
      antiquite_rome: 'Légions',
      contemporain: 'Armée Moderne',
      cyberpunk: 'Cybermilice',
      futur_proche: 'Drones Autonomes',
      fantasy: 'Ordre des Champions',
      post_apo: 'Milices Armées'
    },
    tiers: [
      { tier: 1, cost: 8,  bonusEvery: 3, bonus: { military: +1 }, label: 'Garnison' },
      { tier: 2, cost: 15, bonusEvery: 3, bonus: { military: +2 }, label: 'Caserne' },
      { tier: 3, cost: 25, bonusEvery: 2, bonus: { military: +2, support: +1 }, label: 'Citadelle' },
      { tier: 4, cost: 40, bonusEvery: 2, bonus: { military: +3, diplomacy: +1 }, label: 'Doctrine' }
    ]
  },
  {
    id: 'society',
    icon: '👥',
    baseLabel: 'Société',
    labelByGenre: {
      medieval: 'Universités',
      moyen_age_eu: 'Universités',
      antique: 'Forum',
      antiquite_rome: 'Forum',
      contemporain: 'Réseaux Sociaux',
      cyberpunk: 'Réseaux Sociaux',
      futur_proche: 'Démocratie Liquide',
      fantasy: 'Cercles Druidiques',
      post_apo: 'Collectifs'
    },
    tiers: [
      { tier: 1, cost: 8,  bonusEvery: 3, bonus: { support: +1 }, label: 'École' },
      { tier: 2, cost: 15, bonusEvery: 3, bonus: { support: +2 }, label: 'Bibliothèque' },
      { tier: 3, cost: 25, bonusEvery: 2, bonus: { support: +2, diplomacy: +1 }, label: 'Académie' },
      { tier: 4, cost: 40, bonusEvery: 2, bonus: { support: +3, economy: +1 }, label: 'Concorde' }
    ]
  },
  {
    id: 'innovation',
    icon: '🔬',
    baseLabel: 'Innovation',
    labelByGenre: {
      medieval: 'Grimoires',
      moyen_age_eu: 'Grimoires',
      antique: 'Mécaniques',
      antiquite_rome: 'Mécaniques',
      contemporain: 'R&D',
      cyberpunk: 'Bio-tech',
      futur_proche: 'IA Avancée',
      fantasy: 'Magie Arcanique',
      post_apo: 'Bricolage'
    },
    tiers: [
      { tier: 1, cost: 8,  bonusEvery: 4, bonus: { economy: +1, support: +1 }, label: 'Curiosité' },
      { tier: 2, cost: 15, bonusEvery: 3, bonus: { economy: +1, military: +1 }, label: 'Découverte' },
      { tier: 3, cost: 25, bonusEvery: 2, bonus: { economy: +1, military: +1, diplomacy: +1 }, label: 'Percée' },
      { tier: 4, cost: 40, bonusEvery: 2, bonus: { economy: +2, military: +2, support: +1, diplomacy: +1 }, label: 'Renaissance' }
    ]
  }
];

export function getTechLabel(branchId, genre) {
  const branch = TECH_BRANCHES.find((b) => b.id === branchId);
  if (!branch) return branchId;
  return branch.labelByGenre?.[genre] || branch.baseLabel;
}

export function defaultTech() {
  return { economy: 0, military: 0, society: 0, innovation: 0 };
}

// Vérifie si on peut débloquer le palier `tier` de la branche `branchId`.
// Règle : le tier doit être exactement (current+1) ET le treasury doit couvrir le coût.
export function canUnlockTech(treasury, techState, branchId) {
  const branch = TECH_BRANCHES.find((b) => b.id === branchId);
  if (!branch) return { ok: false, reason: 'unknown_branch' };
  const current = techState?.[branchId] ?? 0;
  if (current >= branch.tiers.length) return { ok: false, reason: 'maxed' };
  const next = branch.tiers[current];
  if ((treasury || 0) < next.cost) return { ok: false, reason: 'no_treasury', cost: next.cost };
  return { ok: true, cost: next.cost, tier: next };
}

// Applique les bonus passifs des paliers débloqués selon la cadence (`bonusEvery`).
// Retourne `gauges` modifiées (treasury est une jauge 0..100 dans Règne, comme les autres).
export function applyTechBonuses(gauges, techState, turn) {
  const next = { ...gauges };
  for (const branch of TECH_BRANCHES) {
    const lvl = techState?.[branch.id] ?? 0;
    if (lvl === 0) continue;
    for (let t = 0; t < lvl; t++) {
      const tier = branch.tiers[t];
      if ((turn % tier.bonusEvery) !== 0) continue;
      for (const [k, v] of Object.entries(tier.bonus || {})) {
        if (next[k] !== undefined) {
          next[k] = clamp(next[k] + v, 0, 100);
        }
      }
    }
  }
  return next;
}

// === MARCHÉ MONDIAL — RESSOURCES FLUCTUANTES (Phase WSS-5) ===
// 3 ressources avec prix multiplicatif autour de 1.0. À chaque tour, random walk borné
// ±0.10 + mean reversion vers 1.0. Si ressource >1.5 ou <0.7, impact petit sur économie/trésor.
export const MARKET_RESOURCES = {
  vivres:  { label: 'Vivres',  icon: '🌾', affects: 'economy' },
  metaux:  { label: 'Métaux',  icon: '⚙',  affects: 'economy' },
  devise:  { label: 'Devise',  icon: '💱', affects: 'treasury' }
};

export function defaultMarket() {
  return { vivres: 1.0, metaux: 1.0, devise: 1.0 };
}

// Avance le marché d'un tour. Retourne { market: nouveau, impacts: { economy, treasury } }.
export function advanceMarket(market, turn = 0) {
  const m = { ...(market || defaultMarket()) };
  const impacts = {};
  for (const k of Object.keys(MARKET_RESOURCES)) {
    const cur = m[k] ?? 1.0;
    // Random walk : ±0.10
    const noise = (Math.random() - 0.5) * 0.20;
    // Mean reversion : 10% de l'écart à 1.0 ramené chaque tour
    const reversion = (1.0 - cur) * 0.10;
    let next = cur + noise + reversion;
    next = Math.max(0.5, Math.min(2.0, next));
    m[k] = Math.round(next * 100) / 100;

    // Impact si écart fort
    const affects = MARKET_RESOURCES[k].affects;
    if (next > 1.5) {
      // Ressource chère = bonne pour l'économie/trésor si tu la produis, mauvaise sinon.
      // Heuristique simple : on pénalise un peu (assume tu en consommes plus que tu en produis).
      impacts[affects] = (impacts[affects] || 0) - 1;
    } else if (next < 0.7) {
      // Ressource pas chère = légère opportunité
      impacts[affects] = (impacts[affects] || 0) + 1;
    }
  }
  return { market: m, impacts };
}

// Affichage compact du marché : retourne un texte court "📈 Vivres +12% Métaux -5%"
export function marketBadge(market) {
  if (!market) return '';
  const parts = [];
  for (const [k, v] of Object.entries(market)) {
    const pct = Math.round((v - 1.0) * 100);
    if (Math.abs(pct) < 8) continue; // skip variations négligeables
    const sign = pct > 0 ? '+' : '';
    const icon = MARKET_RESOURCES[k]?.icon || '';
    const label = MARKET_RESOURCES[k]?.label || k;
    parts.push(`${icon} ${label} ${sign}${pct}%`);
  }
  return parts.join(' · ');
}

// === DIPLOMATIE — NATIONS VOISINES (Phase WSS-4) ===
const NEIGHBOR_REGIMES = {
  medieval: ['Duché', 'Royaume', 'Théocratie', 'Comté', 'Principauté'],
  moyen_age_eu: ['Duché', 'Royaume', 'Théocratie', 'Comté', 'Principauté'],
  moyen_age_asie: ['Empire', 'Khanat', 'Sultanat', 'Royaume'],
  moyen_age_orient: ['Sultanat', 'Califat', 'Émirat', 'Royaume'],
  empire_xvi: ['Royaume', 'Empire', 'République marchande', 'Ligue'],
  antique: ['Cité-État', 'Royaume', 'Confédération', 'Empire'],
  antiquite_rome: ['Cité-État', 'Royaume', 'Confédération', 'République'],
  antiquite_grece: ['Cité-État', 'Ligue', 'Royaume'],
  antiquite_egypte: ['Royaume', 'Pharaonat', 'Cité-État'],
  antiquite_perse: ['Satrapie', 'Empire', 'Royaume'],
  renaissance: ['Cité-État', 'Royaume', 'République marchande', 'Duché'],
  moderne: ['Royaume', 'République', 'Empire colonial'],
  xx_siecle: ['République', 'Royaume', 'Régime militaire', 'Démocratie populaire'],
  contemporain: ['République', 'Démocratie', 'Régime autoritaire', 'Monarchie constitutionnelle'],
  futur_proche: ['Démocratie IA', 'Technocratie', 'Confédération', 'Cité-État'],
  futur_lointain: ['Confédération stellaire', 'Hégémonie', 'Cité orbitale', 'Mégacorp'],
  fantasy: ['Royaume', 'Théocratie', 'Conseil des Mages', 'Confédération elfe'],
  scifi: ['Confédération stellaire', 'Hégémonie', 'Cité orbitale', 'Collectif'],
  post_apo: ['Faction', 'Bunker', 'Caravane', 'Théocratie'],
  uchronie: ['Empire', 'Royaume', 'République'],
  cyberpunk: ['Mégacorpo', 'Cité-État', 'Zone autonome', 'Cartel'],
  steampunk: ['Royaume à vapeur', 'Empire', 'Cité-État', 'Confédération'],
  default: ['Royaume', 'République', 'Cité-État', 'Empire']
};

const NEIGHBOR_NAMES = {
  medieval: ['Valoria', 'Ostmark', 'Rhûnedale', 'Carnethrir', 'Auberon', 'Theldoria', 'Brynhold'],
  moyen_age_eu: ['Valoria', 'Ostmark', 'Rhûnedale', 'Carnethrir', 'Auberon', 'Theldoria', 'Brynhold'],
  antique: ['Etruria', 'Massilia', 'Pergamum', 'Numidia', 'Helvetia', 'Hesperia'],
  contemporain: ['Vellaria', 'Astoria', 'Karelia', 'Novgrad', 'Tannöria', 'Ostvik'],
  cyberpunk: ['Neon-7', 'Sektor Δ', 'Helix Corp', 'Vortex Bay', 'Iron Sprawl', 'Nyx Zone'],
  scifi: ['Tau Ceti', 'Aurora Prime', 'Vega Confederacy', 'Solaris-IV', 'Helia'],
  fantasy: ['Aelwyn', 'Drakmoor', 'Sylvanaar', 'Eldhaven', 'Korthal', 'Faelmir'],
  default: ['Vellaria', 'Astoria', 'Karelia', 'Novgrad', 'Tannöria', 'Ostvik', 'Aelwyn', 'Drakmoor']
};

// Génère 3-5 nations voisines au démarrage du règne.
export function generateNeighbors(genre = 'default', n = 3) {
  const regimes = NEIGHBOR_REGIMES[genre] || NEIGHBOR_REGIMES.default;
  const names = NEIGHBOR_NAMES[genre] || NEIGHBOR_NAMES.default;
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  const out = [];
  for (let i = 0; i < Math.min(n, shuffled.length); i++) {
    out.push({
      name: shuffled[i],
      regime: regimes[Math.floor(Math.random() * regimes.length)],
      power: 30 + Math.floor(Math.random() * 50), // 30..80
      attitude: 40 + Math.floor(Math.random() * 30), // 40..70 init (neutre)
      lastInteractionTurn: 0
    });
  }
  return out;
}

// Met à jour l'attitude d'un voisin (un seul ciblé par tour) selon la philosophie du choix.
// Retourne le voisin modifié pour permettre un toast.
const PHILO_ATTITUDE_DELTA = {
  diplomatique: +6,
  humaniste: +3,
  ecologique: +2,
  pragmatique: 0,
  liberale: 0,
  populiste: -1,
  militariste: -5,
  autocratique: -3,
  libre: 0,
  incoherente: 0
};

export function updateNeighborAttitudes(neighbors, choice, impacts, turn = 0) {
  if (!neighbors || !neighbors.length || !choice) return null;
  // Cible : voisin ayant la plus longue attente sans interaction (oldest lastInteractionTurn)
  const target = [...neighbors].sort((a, b) => (a.lastInteractionTurn || 0) - (b.lastInteractionTurn || 0))[0];
  if (!target) return null;
  let delta = PHILO_ATTITUDE_DELTA[choice.philosophy] ?? 0;
  // Modulation selon impacts diplomatie/militaire
  if (Number.isFinite(impacts?.diplomacy)) delta += Math.round(impacts.diplomacy / 4);
  if (Number.isFinite(impacts?.military) && impacts.military > 8) delta -= 2;
  if (delta === 0) return null;
  // Borne
  delta = Math.max(-10, Math.min(10, delta));
  target.attitude = clamp((target.attitude || 50) + delta, 0, 100);
  target.lastInteractionTurn = turn;
  return { neighborName: target.name, regime: target.regime, attitude: target.attitude, delta };
}

// Décrit l'attitude lisible — clé i18n.
export function describeAttitude(value) {
  if (value >= 75) return 'attitude_ally';
  if (value >= 60) return 'attitude_friend';
  if (value >= 40) return 'attitude_neutral';
  if (value >= 25) return 'attitude_tense';
  return 'attitude_hostile';
}

// === IDÉOLOGIE ÉVOLUTIVE (Phase WSS-1) ===
// Map philosophie → deltas par trait. Valeurs de 0-100 ; +X tire vers le pôle droit, -X vers gauche.
// pragmatism : 0=pragmatique, 100=idéaliste
// force : 0=force, 100=diplomatie
// tradition : 0=tradition, 100=innovation
// discretion : 0=discrétion, 100=charisme
const PHILOSOPHY_TRAIT_DELTAS = {
  pragmatique:  { pragmatism: -2 },
  humaniste:    { pragmatism: +3, force: +2, discretion: +1 },
  militariste:  { force: -3, tradition: -1 },
  diplomatique: { force: +3, discretion: +1 },
  liberale:     { tradition: +2, pragmatism: -1 },
  populiste:    { discretion: +3, tradition: -1 },
  autocratique: { force: -2, discretion: -2 },
  ecologique:   { tradition: +1, pragmatism: +2 },
  libre:        { discretion: +1 }, // décision originale = un peu de charisme
  incoherente:  {} // pas de drift
};

const DRIFT_THRESHOLD = 25; // un trait qui dérive de >=25 points par rapport à l'initial déclenche un toast

// Décrit la dérive sous forme lisible (utilisée pour le toast et le philosophomètre).
const DRIFT_LABELS = {
  pragmatism: { neg: 'plus pragmatique', pos: 'plus idéaliste' },
  force:      { neg: 'plus martial',     pos: 'plus diplomate' },
  tradition:  { neg: 'plus traditionaliste', pos: 'plus réformateur' },
  discretion: { neg: 'plus discret',     pos: 'plus charismatique' }
};

// Applique le drift à `traits` selon la `philosophy` du choix qui vient d'être fait.
// Retourne { traits: nouveau, drifted: { traitId, label, delta } | null }
// `drifted` est non-null si CE choix vient de pousser un trait au-delà du seuil par rapport à initial.
export function driftTraits(traits, philosophy, initialTraits) {
  const next = { ...(traits || {}) };
  const init = initialTraits || {};
  const deltas = PHILOSOPHY_TRAIT_DELTAS[philosophy] || {};
  let crossedTrait = null;
  for (const [k, d] of Object.entries(deltas)) {
    const before = next[k] ?? 50;
    const after = clamp(before + d, 0, 100);
    next[k] = after;
    const initVal = init[k] ?? 50;
    const totalDriftBefore = Math.abs(before - initVal);
    const totalDriftAfter = Math.abs(after - initVal);
    if (totalDriftAfter >= DRIFT_THRESHOLD && totalDriftBefore < DRIFT_THRESHOLD) {
      const isPos = after > initVal;
      const label = DRIFT_LABELS[k]?.[isPos ? 'pos' : 'neg'] || k;
      crossedTrait = { traitId: k, label, delta: after - initVal };
    }
  }
  return { traits: next, drifted: crossedTrait };
}

export function describeTraits(traits = {}) {
  return PLAYER_TRAITS.map((t) => {
    const v = traits[t.id] ?? 50;
    if (v <= 30) return `${t.leftLabel.toLowerCase()} (${v})`;
    if (v >= 70) return `${t.rightLabel.toLowerCase()} (${v})`;
    return `équilibré sur ${t.label.toLowerCase()}`;
  }).join(', ');
}

// --- CONSEILLERS PERSISTANTS ---
const ADVISOR_TEMPLATES = [
  { role: 'Ministre des Finances', personalityPool: ['austère', 'pragmatique', 'inquiet en permanence', 'ambitieux et calculateur'] },
  { role: 'Chef d\'État-Major', personalityPool: ['va-t-en-guerre', 'tactique et patient', 'paranoïaque', 'loyal jusqu\'à la mort'] },
  { role: 'Conseiller du Peuple', personalityPool: ['populiste', 'idéaliste', 'manipulateur', 'sincèrement humaniste'] },
  { role: 'Ambassadeur en Chef', personalityPool: ['mielleux', 'roué', 'cosmopolite et insolent', 'diplomate de la vieille école'] },
  { role: 'Grand Chambellan', personalityPool: ['conspirateur', 'protecteur du dirigeant', 'cynique et drôle', 'soumis mais informé'] }
];

const ADVISOR_NAMES = {
  medieval: ['Aldwin', 'Brigitta', 'Cosimo', 'Edda', 'Gerolt', 'Hilde', 'Loth', 'Mira', 'Osric', 'Tilda'],
  antique: ['Aetius', 'Cassia', 'Decimus', 'Hypatia', 'Lucilius', 'Octavia', 'Tiberius', 'Vespasia', 'Marcellus', 'Cornelia'],
  contemporain: ['Anaïs', 'Boris', 'Camille', 'Diego', 'Émilie', 'Farouk', 'Gabriela', 'Hector', 'Inès', 'Jonas'],
  cyberpunk: ['Nyx', 'Vex', 'Zara', 'Riko', 'Kaiden', 'Neon', 'Sable', 'Vortex', 'Phoenix', 'Echo'],
  scifi: ['Aria-7', 'Cyrus', 'Elya', 'Joran', 'Lira', 'Nox', 'Sela', 'Tarn', 'Vera', 'Zell'],
  fantasy: ['Aelar', 'Brynn', 'Caelen', 'Drystan', 'Eowyn', 'Fjorn', 'Gwyn', 'Halan', 'Iyrin', 'Korvash'],
  default: ['Andre', 'Bran', 'Celia', 'Dara', 'Erin', 'Fynn', 'Gaia', 'Halim', 'Ira', 'Jules']
};

export function generateAdvisors(genre = 'default', seed = null) {
  const namePool = ADVISOR_NAMES[genre] || ADVISOR_NAMES.default;
  const advisors = [];
  // Mélange déterministe optionnel via seed
  let i = seed ? Math.abs(hashString(seed)) % namePool.length : Math.floor(Math.random() * namePool.length);
  for (let k = 0; k < ADVISOR_TEMPLATES.length; k++) {
    const t = ADVISOR_TEMPLATES[k];
    const name = namePool[i % namePool.length];
    const personality = t.personalityPool[Math.floor(Math.random() * t.personalityPool.length)];
    advisors.push({
      name,
      title: t.role,
      personality,
      // Phase 4 : loyauté 0-100, jauge favorite, état (alive/deceased/fled), tour de mort éventuel
      loyalty: 60,
      expertise: ADVISOR_EXPERTISE[k] || 'support',
      status: 'alive',
      appearances: 0,
      legendarySinceTurn: null
    });
    i++;
  }
  return advisors;
}

// Mapping des conseillers à leur jauge experte (dans l'ordre des templates)
const ADVISOR_EXPERTISE = ['treasury', 'military', 'support', 'diplomacy', 'economy'];

// Met à jour la loyauté du conseiller le plus pertinent à un choix donné.
// Retourne { advisor, delta, betrayed: boolean } pour permettre à l'UI de signaler un événement.
export function adjustAdvisorLoyalty(advisors, choice, impacts) {
  if (!advisors || !advisors.length || !choice) return null;
  // Conseiller pertinent : celui dont l'expertise est la jauge la plus impactée (positivement ou non)
  let target = null;
  let maxAbs = 0;
  for (const a of advisors) {
    if (a.status !== 'alive') continue;
    const v = Math.abs(Number(impacts?.[a.expertise]) || 0);
    if (v > maxAbs) { maxAbs = v; target = a; }
  }
  if (!target) return null;
  const sign = (impacts?.[target.expertise] || 0) >= 0 ? 1 : -1;
  // Conseiller content si on a touché sa jauge dans le bon sens (positif), mécontent sinon.
  // Boost atténué si on prend l'option contraire à sa philosophie supposée.
  const delta = sign === 1 ? Math.min(8, 2 + Math.round(maxAbs / 3)) : -Math.min(10, 3 + Math.round(maxAbs / 2));
  target.loyalty = clamp((target.loyalty || 60) + delta, 0, 100);

  // Conseiller légendaire : loyauté > 80 pendant 10 tours
  if (target.loyalty >= 80 && target.legendarySinceTurn == null) {
    target.legendarySinceTurn = 0; // sera incrémenté par tour ailleurs
  } else if (target.loyalty < 80) {
    target.legendarySinceTurn = null;
  }

  return { advisorId: target.name, delta, loyalty: target.loyalty, betrayed: target.loyalty < 20 };
}

// Avance d'un tour : incrémente legendarySinceTurn pour les conseillers ≥80.
export function advanceAdvisorTurn(advisors) {
  if (!advisors) return;
  for (const a of advisors) {
    if (a.status === 'alive' && a.loyalty >= 80 && a.legendarySinceTurn != null) {
      a.legendarySinceTurn = (a.legendarySinceTurn || 0) + 1;
    }
  }
}

// Templates d'opinion offline selon (jauge, personnalité). Affiché avant les choix.
const OPINION_TEMPLATES = {
  treasury: {
    austère: 'Sire, chaque pièce dépensée est une ride sur ma tempe.',
    pragmatique: 'Examinons les chiffres avant tout grand geste.',
    'inquiet en permanence': 'Et si nous n\'avions pas les moyens, Sire ? J\'y pense la nuit.',
    'ambitieux et calculateur': 'Une crise est aussi une opportunité — pour qui sait la voir.'
  },
  military: {
    'va-t-en-guerre': 'Frappons les premiers, Sire. La gloire n\'attend pas.',
    'tactique et patient': 'Étudions le terrain avant de bouger un seul soldat.',
    paranoïaque: 'Quelqu\'un, ici même, prépare votre chute. Soyez vigilant.',
    'loyal jusqu\'à la mort': 'À vos ordres, quoi qu\'il arrive.'
  },
  support: {
    populiste: 'Le peuple gronde — donnez-lui du pain et un ennemi.',
    idéaliste: 'C\'est une question de justice, pas de calcul, Sire.',
    manipulateur: 'Le peuple croira ce qu\'on voudra qu\'il croie.',
    'sincèrement humaniste': 'Pensez d\'abord aux plus fragiles, Sire.'
  },
  diplomacy: {
    mielleux: 'Tout peut se négocier, Sire. Tout. Vraiment tout.',
    roué: 'Ne montrez ni votre or, ni votre main. Surtout votre main.',
    'cosmopolite et insolent': 'Vos voisins n\'attendent qu\'un faux pas. Charmons-les plutôt.',
    'diplomate de la vieille école': 'Une alliance bien rédigée vaut dix batailles gagnées.'
  },
  economy: {
    conspirateur: 'On murmure, Sire. Beaucoup. À votre sujet, surtout.',
    'protecteur du dirigeant': 'Restez à l\'abri ce soir. Je m\'occupe de tout.',
    'cynique et drôle': 'Quelqu\'un finira par mourir. Ou par s\'enrichir. Souvent les deux.',
    'soumis mais informé': 'Si je puis me permettre, Sire — j\'ai entendu ceci…'
  }
};

export function pickAdvisorOpinion(advisor, gauges, impactedGauge = null) {
  if (!advisor) return null;
  const expertise = impactedGauge || advisor.expertise || 'support';
  const pool = OPINION_TEMPLATES[expertise] || {};
  const opinion = pool[advisor.personality];
  if (opinion) return opinion;
  // Fallback générique selon valeur de la jauge
  const v = Number(gauges?.[expertise]) || 50;
  if (v < 30) return `Sire, la situation sur ${expertise} est critique. Il faut agir.`;
  if (v > 70) return `Sire, ${expertise} se porte bien — préservons-le.`;
  return `Sire, je vous laisse décider — je servirai votre choix.`;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return h | 0;
}

// === PHASE 3.3 — ARCS NARRATIFS ===
// Suite d'événements liés sur plusieurs tours. Quand un arc est actif, son contexte
// est injecté dans le prompt IA via buildGameContext.
export const NARRATIVE_ARCS = [
  {
    id: 'war_of_succession',
    name: 'Guerre de Succession',
    triggerCondition: (s) => (s.gauges?.military || 0) > 70 && (s.turn || 0) > 5 && (s.gauges?.support || 0) < 50,
    phases: [
      { offset: 0, hint: 'Un prétendant au trône se manifeste depuis les marches du royaume.' },
      { offset: 2, hint: 'Les partisans du prétendant s\'organisent en faction armée.' },
      { offset: 5, hint: 'La confrontation finale approche — il faut choisir un camp.' }
    ],
    resolveOn: (s) => (s.gauges?.support || 0) >= 65,
    resolution_won: { military: -10, support: 15 },
    resolution_lost: { military: -25, support: -20 }
  },
  {
    id: 'great_plague',
    name: 'La Grande Peste',
    triggerCondition: (s) => (s.turn || 0) >= 12 && (s.gauges?.support || 0) > 60 && Math.random() < 0.3,
    phases: [
      { offset: 0, hint: 'Une épidémie surgit dans les provinces du sud.' },
      { offset: 3, hint: 'L\'épidémie atteint la capitale — panique générale.' },
      { offset: 6, hint: 'Les premiers remèdes sont expérimentés. Espoir ou désastre ?' }
    ],
    resolveOn: (s) => (s.gauges?.support || 0) >= 50,
    resolution_won: { support: 12, economy: -8 },
    resolution_lost: { support: -25, economy: -15 }
  },
  {
    id: 'silver_revolution',
    name: 'Révolution d\'Argent',
    triggerCondition: (s) => (s.gauges?.economy || 0) < 25 && (s.gauges?.support || 0) < 40,
    phases: [
      { offset: 0, hint: 'Les classes laborieuses s\'organisent en confréries clandestines.' },
      { offset: 3, hint: 'Des barricades apparaissent dans les faubourgs.' },
      { offset: 6, hint: 'Le vent tourne — le palais doit décider.' }
    ],
    resolveOn: (s) => (s.gauges?.economy || 0) >= 45 || (s.gauges?.support || 0) >= 60,
    resolution_won: { support: 20, economy: 5 },
    resolution_lost: { support: -30, military: -10 }
  },
  {
    id: 'foreign_invasion',
    name: 'Invasion Étrangère',
    triggerCondition: (s) => (s.gauges?.diplomacy || 0) < 25 && (s.gauges?.military || 0) > 40 && (s.turn || 0) > 8,
    phases: [
      { offset: 0, hint: 'Des troupes massées à la frontière. Provocation ou menace réelle ?' },
      { offset: 2, hint: 'Les premiers coups sont échangés sur les marches.' },
      { offset: 5, hint: 'La capitale ennemie hésite — une dernière chance de paix.' }
    ],
    resolveOn: (s) => (s.gauges?.diplomacy || 0) >= 45 || (s.gauges?.military || 0) >= 75,
    resolution_won: { diplomacy: 10, support: 8 },
    resolution_lost: { diplomacy: -20, military: -25 }
  },
  {
    id: 'religious_schism',
    name: 'Schisme Religieux',
    triggerCondition: (s) => (s.turn || 0) > 15 && (s.gauges?.support || 0) > 55 && Math.random() < 0.25,
    phases: [
      { offset: 0, hint: 'Deux écoles spirituelles s\'affrontent dans la capitale.' },
      { offset: 4, hint: 'Le clergé se divise publiquement — votre couronne est invoquée.' },
      { offset: 8, hint: 'Une prophétie circule. Vrai miracle ou manipulation ?' }
    ],
    resolveOn: (s) => (s.gauges?.diplomacy || 0) >= 55,
    resolution_won: { diplomacy: 12, support: 10 },
    resolution_lost: { support: -20, diplomacy: -10 }
  }
];

// Vérifie si un arc doit se déclencher pour le tour courant. N'en active qu'un à la fois.
export function checkArcTrigger(gameState) {
  if (gameState.activeArcId) return null; // un seul arc actif à la fois
  const seen = new Set(gameState.arcsCompleted || []);
  for (const arc of NARRATIVE_ARCS) {
    if (seen.has(arc.id)) continue; // pas deux fois le même arc
    try {
      if (arc.triggerCondition(gameState)) return arc.id;
    } catch (err) { console.warn('[arcs] trigger failed:', arc.id, err); }
  }
  return null;
}

// Calcule la phase courante de l'arc actif (0..N-1).
export function getActiveArcPhase(gameState) {
  if (!gameState.activeArcId || gameState.arcStartTurn == null) return null;
  const arc = NARRATIVE_ARCS.find((a) => a.id === gameState.activeArcId);
  if (!arc) return null;
  const elapsed = (gameState.turn || 0) - gameState.arcStartTurn;
  let phase = arc.phases[0];
  for (const p of arc.phases) if (elapsed >= p.offset) phase = p;
  return { arc, phase, elapsed };
}

// Tente de résoudre l'arc actif. Retourne { resolved, won, impacts } si terminé.
export function tryResolveArc(gameState) {
  if (!gameState.activeArcId) return null;
  const arc = NARRATIVE_ARCS.find((a) => a.id === gameState.activeArcId);
  if (!arc) return null;
  const elapsed = (gameState.turn || 0) - (gameState.arcStartTurn || 0);
  // Résolution si la condition est remplie OU après la dernière phase + 2 tours
  const lastOffset = arc.phases[arc.phases.length - 1].offset;
  const overdue = elapsed > lastOffset + 2;
  let won = false;
  try { won = arc.resolveOn(gameState); } catch {}
  if (won || overdue) {
    return { resolved: true, won, impacts: won ? arc.resolution_won : arc.resolution_lost, arcId: arc.id };
  }
  return null;
}

// Fait clé extrait du déroulement — pour le contexte IA
export function appendKeyFact(keyFacts, fact, max = 10) {
  if (!fact || typeof fact !== 'string') return keyFacts;
  const trimmed = fact.trim();
  if (!trimmed) return keyFacts;
  const next = [...(keyFacts || []), trimmed];
  if (next.length > max) return next.slice(next.length - max);
  return next;
}

export function appendHistory(history, entry, max = 8) {
  const next = [...(history || []), entry];
  if (next.length > max) return next.slice(next.length - max);
  return next;
}

// Calcul de l'année en jeu : selon l'époque, chaque tour = N mois ou N années
export function advanceYear(currentYear, era, turnsPerYear = 4) {
  if (typeof currentYear !== 'number') return currentYear;
  // Par défaut : un tour = un trimestre
  const yearAdvance = 1 / Math.max(1, turnsPerYear);
  return Math.round((currentYear + yearAdvance) * 100) / 100;
}

export function getStartingYear(era) {
  const map = {
    antiquite_rome: -100,
    antiquite_grece: -400,
    antiquite_egypte: -1300,
    antiquite_perse: -500,
    moyen_age_eu: 1100,
    moyen_age_asie: 1200,
    moyen_age_orient: 1100,
    renaissance: 1500,
    moderne: 1750,
    xx_siecle: 1950,
    contemporain: 2025,
    futur_proche: 2050,
    futur_lointain: 2200,
    fantasy: 1000,
    scifi: 2400,
    post_apo: 2080,
    uchronie: 1900,
    cyberpunk: 2077,
    steampunk: 1880,
    empire_xvi: 1550
  };
  return map[era] ?? 2025;
}
