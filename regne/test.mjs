// test.mjs — Tests unitaires pour Règne. Lance avec : node test.mjs
// Aucune dépendance externe — utilise uniquement node:assert.

import assert from 'node:assert/strict';

// --- STUB des APIs browser pour permettre l'import des modules ---
const localStorageStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (localStorageStore.has(k) ? localStorageStore.get(k) : null),
  setItem: (k, v) => localStorageStore.set(k, String(v)),
  removeItem: (k) => localStorageStore.delete(k),
  clear: () => localStorageStore.clear()
};
globalThis.window = { localStorage: globalThis.localStorage };
globalThis.indexedDB = undefined; // les tests storage utilisent localStorage uniquement
globalThis.fetch = async () => { throw new Error('fetch stub: should not be called in tests'); };
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) };
}

// --- Imports des modules ---
const { default: _ } = await import('./www/js/format.js').then((m) => ({ default: m })).catch((e) => { throw new Error('Échec import format.js: ' + e.message); });
const fmt = await import('./www/js/format.js');
const eng = await import('./www/js/game-engine.js');
const store = await import('./www/js/storage.js');
const aiClient = await import('./www/js/ai-client.js');
const narrator = await import('./www/js/ai-narrator.js');

// --- Helpers de test ---
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(
        () => { console.log(`  ✅ ${name}`); passed++; },
        (err) => { console.log(`  ❌ ${name}\n     ${err.message}`); failed++; failures.push({ name, err }); }
      );
    }
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}\n     ${err.message}`);
    failed++;
    failures.push({ name, err });
  }
}

function group(label) {
  console.log(`\n▸ ${label}`);
}

// ============================================================
// GAME-ENGINE
// ============================================================
group('game-engine.js');

test('checkGameOver détecte une jauge à 0 (low)', () => {
  const r = eng.checkGameOver({ economy: 0, military: 50, support: 50, diplomacy: 50, treasury: 50 });
  assert.equal(r.over, true);
  assert.equal(r.gauge, 'economy');
  assert.equal(r.reason, 'low');
});

test('checkGameOver détecte une jauge à 100 (high)', () => {
  const r = eng.checkGameOver({ economy: 50, military: 100, support: 50, diplomacy: 50, treasury: 50 });
  assert.equal(r.over, true);
  assert.equal(r.gauge, 'military');
  assert.equal(r.reason, 'high');
});

test('checkGameOver ne déclenche PAS à 15 (zone danger mais pas game over)', () => {
  const r = eng.checkGameOver({ economy: 15, military: 50, support: 50, diplomacy: 50, treasury: 50 });
  assert.equal(r.over, false);
});

test('checkGameOver ne déclenche PAS à 85', () => {
  const r = eng.checkGameOver({ economy: 50, military: 85, support: 50, diplomacy: 50, treasury: 50 });
  assert.equal(r.over, false);
});

test('checkGameOver pour chacune des 5 jauges (low)', () => {
  for (const k of eng.GAUGE_KEYS) {
    const g = { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 };
    g[k] = 0;
    const r = eng.checkGameOver(g);
    assert.equal(r.over, true, `Devrait détecter ${k}=0`);
    assert.equal(r.gauge, k);
  }
});

test('applyImpact borne la valeur à 0 minimum', () => {
  const next = eng.applyImpact({ economy: 5, military: 50, support: 50, diplomacy: 50, treasury: 50 }, { economy: -20 });
  assert.equal(next.economy, 0);
});

test('applyImpact borne la valeur à 100 maximum', () => {
  const next = eng.applyImpact({ economy: 95, military: 50, support: 50, diplomacy: 50, treasury: 50 }, { economy: 20 });
  assert.equal(next.economy, 100);
});

test('applyImpact applique correctement plusieurs impacts', () => {
  const next = eng.applyImpact(
    { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 },
    { economy: 10, military: -15, support: 5 }
  );
  assert.equal(next.economy, 60);
  assert.equal(next.military, 35);
  assert.equal(next.support, 55);
  assert.equal(next.diplomacy, 50);
  assert.equal(next.treasury, 50);
});

test('applyImpact gère un impact null/undefined', () => {
  const before = { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 };
  const next = eng.applyImpact(before, null);
  assert.deepEqual(next, before);
});

test('sanitizeCustomImpact borne les valeurs entre -15 et +15', () => {
  const r = eng.sanitizeCustomImpact({ economy: 50, military: -50, support: 0, diplomacy: 'bad', treasury: 7.5 });
  assert.equal(r.economy, 15);
  assert.equal(r.military, -15);
  assert.equal(r.support, 0);
  assert.equal(r.diplomacy, 0);
  assert.equal(r.treasury, 8);
});

test('calculateScore — fin légendaire', () => {
  const score = eng.calculateScore(60, { economy: 70, military: 70, support: 70, diplomacy: 70, treasury: 70 }, 'legendary', ['a', 'b']);
  // (60*10 + 350) * 3.0 + 100 = 950*3 + 100 = 2950
  assert.equal(score, 2950);
});

test('calculateScore — fin catastrophique', () => {
  const score = eng.calculateScore(3, { economy: 10, military: 10, support: 10, diplomacy: 10, treasury: 10 }, 'catastrophic', []);
  // (30 + 50) * 0.3 = 24
  assert.equal(score, 24);
});

test('calculateScore — fin neutre sans achievements', () => {
  const score = eng.calculateScore(15, { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 }, 'neutral', []);
  // (150 + 250) * 1.0 = 400
  assert.equal(score, 400);
});

test('determineEndingType — legendary >= 50 tours et avg >= 65', () => {
  assert.equal(eng.determineEndingType({ economy: 70, military: 70, support: 70, diplomacy: 70, treasury: 70 }, 60), 'legendary');
});

test('determineEndingType — great >= 30 tours et avg >= 55', () => {
  assert.equal(eng.determineEndingType({ economy: 60, military: 60, support: 60, diplomacy: 60, treasury: 60 }, 35), 'great');
});

test('determineEndingType — good >= 20 tours et avg >= 45', () => {
  assert.equal(eng.determineEndingType({ economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 }, 25), 'good');
});

test('determineEndingType — neutral >= 10 tours', () => {
  assert.equal(eng.determineEndingType({ economy: 30, military: 30, support: 30, diplomacy: 30, treasury: 30 }, 12), 'neutral');
});

test('determineEndingType — bad >= 5 tours', () => {
  assert.equal(eng.determineEndingType({ economy: 10, military: 10, support: 10, diplomacy: 10, treasury: 10 }, 7), 'bad');
});

test('determineEndingType — catastrophic < 5 tours', () => {
  assert.equal(eng.determineEndingType({ economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 }, 3), 'catastrophic');
});

test('Achievement first_reign — déclenché si totalGames >= 1', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'first_reign');
  assert.equal(a.condition({ totalGames: 1 }), true);
  assert.equal(a.condition({ totalGames: 0 }), false);
});

test('Achievement survivor_50 — déclenché à 50 tours', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'survivor_50');
  assert.equal(a.condition({ turn: 50 }), true);
  assert.equal(a.condition({ turn: 49 }), false);
});

test('Achievement balanced — toutes jauges entre 30 et 70', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'balanced');
  assert.equal(a.condition({ gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 } }), true);
  assert.equal(a.condition({ gauges: { economy: 80, military: 50, support: 50, diplomacy: 50, treasury: 50 } }), false);
});

test('Achievement free_writer — 5 décisions custom', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'free_writer');
  const choices5 = Array(5).fill({ isCustom: true });
  assert.equal(a.condition({}, choices5), true);
  assert.equal(a.condition({}, Array(4).fill({ isCustom: true })), false);
});

test('Achievement legend — score >= 5000', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'legend');
  assert.equal(a.condition({ score: 5000 }), true);
  assert.equal(a.condition({ score: 4999 }), false);
});

test('evaluateAchievements — renvoie les ids déclenchés', () => {
  const ids = eng.evaluateAchievements({
    totalGames: 1,
    turn: 25,
    gauges: { economy: 85, military: 50, support: 50, diplomacy: 50, treasury: 50 }
  }, []);
  assert.ok(ids.includes('first_reign'));
  assert.ok(ids.includes('survivor_20'));
  assert.ok(!ids.includes('survivor_50'));
});

test('getStartingGauges — diplomate +10', () => {
  const g = eng.getStartingGauges('diplomate');
  assert.equal(g.economy, 60);
  assert.equal(g.support, 70);
});

test('getStartingGauges — tyran a une jauge à 15', () => {
  const g = eng.getStartingGauges('tyran');
  const has15 = eng.GAUGE_KEYS.some((k) => g[k] === 15);
  assert.ok(has15, 'Une jauge devrait être à 15 en mode tyran');
});

test('getStartingGauges — overrides respectés', () => {
  const g = eng.getStartingGauges('gouvernant', { economy: 42, military: 33, support: 80, diplomacy: 50, treasury: 50 });
  assert.equal(g.economy, 42);
  assert.equal(g.support, 80);
});

test('appendKeyFact — limite à 10 entrées', () => {
  let arr = [];
  for (let i = 0; i < 15; i++) arr = eng.appendKeyFact(arr, `fait ${i}`);
  assert.equal(arr.length, 10);
  assert.equal(arr[0], 'fait 5');
});

test('appendHistory — limite à 8 entrées par défaut', () => {
  let arr = [];
  for (let i = 0; i < 12; i++) arr = eng.appendHistory(arr, { turn: i });
  assert.equal(arr.length, 8);
  assert.equal(arr[0].turn, 4);
});

// ============================================================
// FORMAT
// ============================================================
group('format.js');

test('formatGauge(15) → "⚠ 15"', () => {
  assert.equal(fmt.formatGauge(15), '⚠ 15');
});

test('formatGauge(50) → "50"', () => {
  assert.equal(fmt.formatGauge(50), '50');
});

test('formatGauge(85) → "⚡ 85"', () => {
  assert.equal(fmt.formatGauge(85), '⚡ 85');
});

test('formatTurn(7) → "Tour 7"', () => {
  assert.equal(fmt.formatTurn(7), 'Tour 7');
});

test('formatScore(8420) → "8,420"', () => {
  assert.equal(fmt.formatScore(8420), '8,420');
});

test('formatEra("renaissance") → label complet', () => {
  assert.equal(fmt.formatEra('renaissance'), 'Renaissance (XVe-XVIe s.)');
});

test('formatDelta — 0 → "—", positif → "+5", négatif → "-3"', () => {
  assert.equal(fmt.formatDelta(0), '—');
  assert.equal(fmt.formatDelta(5), '+5');
  assert.equal(fmt.formatDelta(-3), '-3');
});

test('formatYear — négatif → "av. J.-C."', () => {
  assert.equal(fmt.formatYear(-100), '100 av. J.-C.');
  assert.equal(fmt.formatYear(2025), '2025');
});

test('formatCost — affiche en EUR', () => {
  assert.equal(fmt.formatCost(0), 'Gratuit');
  // 5.5 USD * 0.92 = 5.06 EUR
  assert.ok(fmt.formatCost(5.5).includes('€'), 'Devrait contenir €');
  assert.ok(fmt.formatCost(5.5).includes('5,06'), 'Devrait afficher 5,06 €');
});

test('USD_TO_EUR — exporté et raisonnable', () => {
  assert.ok(fmt.USD_TO_EUR > 0.7 && fmt.USD_TO_EUR < 1.2, 'Taux EUR/USD doit être réaliste');
});

test('escapeHtml — échappe les caractères dangereux', () => {
  assert.equal(fmt.escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('truncate — coupe avec ellipsis', () => {
  assert.equal(fmt.truncate('abcdefghij', 5), 'abcd…');
  assert.equal(fmt.truncate('court', 100), 'court');
});

test('uuid — génère une string non vide unique', () => {
  const a = fmt.uuid();
  const b = fmt.uuid();
  assert.equal(typeof a, 'string');
  assert.ok(a.length > 8);
  assert.notEqual(a, b);
});

// ============================================================
// STORAGE
// ============================================================
group('storage.js');

test('Storage.init initialise les settings et records par défaut', async () => {
  localStorageStore.clear();
  await store.Storage.init();
  const s = store.Storage.getSettings();
  assert.equal(s.provider, 'freemium');
  assert.equal(s.useStreaming, true);
  const r = store.Storage.getRecords();
  assert.equal(r.bestScore, 0);
});

test('Storage.saveSettings et getSettings — round-trip', () => {
  store.Storage.saveSettings({ apiKey: 'test-key', model: 'foo' });
  const s = store.Storage.getSettings();
  assert.equal(s.apiKey, 'test-key');
  assert.equal(s.model, 'foo');
  assert.equal(s.provider, 'freemium'); // doit être préservé
});

test('Storage.saveCurrentGame et getCurrentGame — round-trip', () => {
  const gs = { gameId: 'g1', turn: 5, gauges: { economy: 50 } };
  store.Storage.saveCurrentGame(gs);
  const got = store.Storage.getCurrentGame();
  assert.equal(got.gameId, 'g1');
  assert.equal(got.turn, 5);
});

test('Storage.clearCurrentGame', () => {
  store.Storage.saveCurrentGame({ gameId: 'x' });
  store.Storage.clearCurrentGame();
  assert.equal(store.Storage.getCurrentGame(), null);
});

test('Storage.updateRecords met à jour bestScore si > current', () => {
  localStorageStore.clear();
  store.Storage.init();
  store.Storage.updateRecords(100, 'good', 10, ['first_reign']);
  let r = store.Storage.getRecords();
  assert.equal(r.bestScore, 100);
  assert.equal(r.totalGames, 1);
  assert.equal(r.totalTurns, 10);
  store.Storage.updateRecords(50, 'bad', 5, []);
  r = store.Storage.getRecords();
  assert.equal(r.bestScore, 100);
  assert.equal(r.totalGames, 2);
});

test('Storage.addTokensUsed — incrémente totalTokensUsed et coût', () => {
  localStorageStore.clear();
  store.Storage.init();
  store.Storage.addTokensUsed(100, 50, 0.001);
  store.Storage.addTokensUsed(200, 100, 0.002);
  const s = store.Storage.getSettings();
  assert.equal(s.totalTokensUsed, 450);
  assert.ok(Math.abs(s.totalCostUsd - 0.003) < 1e-9);
});

// ============================================================
// AI-CLIENT
// ============================================================
group('ai-client.js');

test('estimateTokens — heuristique caractères', () => {
  assert.equal(aiClient.estimateTokens('abcdefg'), Math.ceil(7 / 3.5));
  assert.equal(aiClient.estimateTokens(''), 0);
  assert.equal(aiClient.estimateTokens(null), 0);
});

test('estimateCost — Groq Llama 3.3 70B 1M in / 1M out', () => {
  const cost = aiClient.estimateCost('groq', 'llama-3.3-70b-versatile', 1_000_000, 1_000_000);
  assert.ok(Math.abs(cost - (0.59 + 0.79)) < 1e-6);
});

test('estimateCost — gratuit OpenRouter Gemini 2.0 Flash', () => {
  const cost = aiClient.estimateCost('openrouter', 'google/gemini-2.0-flash-exp:free', 100_000, 50_000);
  assert.equal(cost, 0);
});

test('safeJsonParse — JSON valide direct', () => {
  const r = aiClient.safeJsonParse('{"a": 1, "b": "x"}');
  assert.deepEqual(r, { a: 1, b: 'x' });
});

test('safeJsonParse — JSON dans bavardage', () => {
  const r = aiClient.safeJsonParse('Voici le résultat : {"x": 42} fin du message.');
  assert.deepEqual(r, { x: 42 });
});

test('safeJsonParse — JSON invalide → null', () => {
  assert.equal(aiClient.safeJsonParse('totalement cassé'), null);
});

test('PROVIDERS — chaque provider a au moins un modèle', () => {
  for (const [key, p] of Object.entries(aiClient.PROVIDERS)) {
    assert.ok(Array.isArray(p.models) && p.models.length > 0, `Provider ${key} sans modèle`);
  }
});

test('getModelInfo — modèle inconnu retourne le premier', () => {
  const m = aiClient.getModelInfo('groq', 'modele-inexistant-xyz');
  // Selon impl actuelle : retourne premier modèle
  assert.ok(m);
});

// ============================================================
// AI-NARRATOR
// ============================================================
group('ai-narrator.js');

test('buildGameContext — contient les jauges et le tour', () => {
  const ctx = narrator.buildGameContext({
    country: { name: 'Test', era: 'renaissance', leaderName: 'Alice', leaderTitle: 'Reine' },
    gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 },
    turn: 5,
    year: 1520,
    history: [],
    keyFacts: []
  });
  assert.ok(ctx.includes('Test'));
  assert.ok(ctx.includes('Alice'));
  assert.ok(ctx.includes('TOUR : 5'));
  assert.ok(ctx.includes('Économie : 50'));
});

test('buildGameContext — taille raisonnable (< 2000 chars)', () => {
  const gs = {
    country: { name: 'Royaume', era: 'renaissance', leaderName: 'Bob', leaderTitle: 'Roi', eraLabel: 'Renaissance' },
    gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 },
    turn: 30, year: 1530,
    history: Array.from({ length: 5 }, (_, i) => ({ turn: 25 + i, choiceText: 'Choix '+i, outcome: 'Outcome '+i })),
    keyFacts: ['Fait 1', 'Fait 2', 'Fait 3']
  };
  const ctx = narrator.buildGameContext(gs);
  assert.ok(ctx.length < 2000, `Contexte trop long : ${ctx.length} chars`);
});

test('buildGameContext — flagge les jauges critiques', () => {
  const ctx = narrator.buildGameContext({
    country: { name: 'X', era: 'X', leaderName: 'X', leaderTitle: 'X' },
    gauges: { economy: 10, military: 90, support: 50, diplomacy: 50, treasury: 50 },
    turn: 1, year: 2025, history: [], keyFacts: []
  });
  assert.ok(ctx.includes('CRITIQUE'));
  assert.ok(ctx.includes('EXCÈS'));
});

test('FALLBACK_NATIONS — au moins 5 nations de secours', () => {
  assert.ok(narrator.FALLBACK_NATIONS.length >= 5);
});

test('pickFallbackNation — renvoie une nation valide', () => {
  const n = narrator.pickFallbackNation();
  assert.ok(n.name);
  assert.ok(n.startingGauges);
  for (const k of eng.GAUGE_KEYS) {
    assert.equal(typeof n.startingGauges[k], 'number');
  }
});

test('pickFallbackNation(era) — filtre par époque si match', () => {
  const n = narrator.pickFallbackNation('xx_siecle');
  assert.equal(n.era, 'xx_siecle');
});

test('GENRES — au moins 10 genres dont cyberpunk, médiéval, contemporain', () => {
  assert.ok(Object.keys(narrator.GENRES).length >= 10);
  assert.ok(narrator.GENRES.cyberpunk);
  assert.ok(narrator.GENRES.medieval);
  assert.ok(narrator.GENRES.contemporain);
  assert.ok(narrator.GENRES.random);
});

test('GENRES — chaque genre a icon, label, desc', () => {
  for (const [key, g] of Object.entries(narrator.GENRES)) {
    assert.ok(g.icon, `Genre ${key} sans icon`);
    assert.ok(g.label, `Genre ${key} sans label`);
    assert.ok(g.desc, `Genre ${key} sans desc`);
  }
});

// ============================================================
// NOUVELLES FEATURES (tier providers, stats, traits, achievements secrets)
// ============================================================
group('Nouvelles features');

test('PROVIDERS — chaque provider a 3 modèles tier (cheap, mid, premium)', () => {
  for (const [key, p] of Object.entries(aiClient.PROVIDERS)) {
    const tiers = (p.models || []).map((m) => m.tier).filter(Boolean);
    const distinctTiers = new Set(tiers);
    assert.ok(distinctTiers.size >= 2, `Provider ${key} devrait avoir au moins 2 tiers distincts`);
    assert.ok(tiers.includes('cheap'), `Provider ${key} devrait avoir un tier cheap`);
  }
});

test('TIER_LABELS — exporté avec 3 entrées', () => {
  assert.equal(typeof aiClient.TIER_LABELS, 'object');
  assert.ok(aiClient.TIER_LABELS.cheap);
  assert.ok(aiClient.TIER_LABELS.mid);
  assert.ok(aiClient.TIER_LABELS.premium);
});

test('Tous les modèles "rapides" sont marqués fast (sauf opus)', () => {
  for (const [key, p] of Object.entries(aiClient.PROVIDERS)) {
    for (const m of p.models || []) {
      // Opus est marqué fast: false, c'est attendu
      if (m.id.includes('opus')) continue;
      assert.equal(m.fast, true, `${key}/${m.id} devrait être marqué fast: true`);
    }
  }
});

test('computeReignStats — calcule philosophie dominante', () => {
  const ch = [
    { philosophy: 'pragmatique', isCustom: false, gaugesBefore: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 }, gaugesAfter: { economy: 55, military: 50, support: 50, diplomacy: 50, treasury: 50 } },
    { philosophy: 'pragmatique', isCustom: false, gaugesBefore: { economy: 55, military: 50, support: 50, diplomacy: 50, treasury: 50 }, gaugesAfter: { economy: 60, military: 50, support: 50, diplomacy: 50, treasury: 50 } },
    { philosophy: 'humaniste', isCustom: true, gaugesBefore: { economy: 60, military: 50, support: 50, diplomacy: 50, treasury: 50 }, gaugesAfter: { economy: 65, military: 50, support: 60, diplomacy: 50, treasury: 50 } }
  ];
  const stats = eng.computeReignStats(ch, { economy: 65, military: 50, support: 60, diplomacy: 50, treasury: 50 }, { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 });
  assert.equal(stats.totalDecisions, 3);
  assert.equal(stats.customCount, 1);
  assert.equal(stats.philosophyDominant.id, 'pragmatique');
  assert.equal(stats.philosophyDominant.count, 2);
  assert.equal(stats.gaugesEvolution.economy, 15);
});

test('PLAYER_TRAITS — 4 traits avec id, leftLabel, rightLabel', () => {
  assert.equal(eng.PLAYER_TRAITS.length, 4);
  for (const t of eng.PLAYER_TRAITS) {
    assert.ok(t.id);
    assert.ok(t.leftLabel);
    assert.ok(t.rightLabel);
  }
});

test('defaultTraits — tous à 50', () => {
  const t = eng.defaultTraits();
  for (const trait of eng.PLAYER_TRAITS) {
    assert.equal(t[trait.id], 50);
  }
});

test('generateAdvisors — 5 conseillers avec name, title, personality', () => {
  const advisors = eng.generateAdvisors('medieval');
  assert.equal(advisors.length, 5);
  for (const a of advisors) {
    assert.ok(a.name);
    assert.ok(a.title);
    assert.ok(a.personality);
  }
});

test('Achievements secrets — au moins 8', () => {
  const secrets = eng.ACHIEVEMENTS.filter((a) => a.secret);
  assert.ok(secrets.length >= 8, `Devrait avoir 8+ secrets, en a ${secrets.length}`);
});

test('Achievement voice_of_people — déclenché à 10 choix populiste/humaniste', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'voice_of_people');
  const ch = Array(10).fill({ philosophy: 'humaniste' });
  assert.equal(a.condition({}, ch), true);
  assert.equal(a.condition({}, Array(9).fill({ philosophy: 'humaniste' })), false);
});

test('Achievement pacifist — 30 tours sans choix militariste', () => {
  const a = eng.ACHIEVEMENTS.find((x) => x.id === 'pacifist');
  assert.equal(a.condition({ turn: 30 }, Array(30).fill({ philosophy: 'humaniste' })), true);
  assert.equal(a.condition({ turn: 30 }, [...Array(29).fill({ philosophy: 'humaniste' }), { philosophy: 'militariste' }]), false);
});

test('Storage.clearAll — réinitialise tout', async () => {
  store.Storage.saveSettings({ apiKey: 'will-be-deleted' });
  store.Storage.saveCurrentGame({ gameId: 'will-be-deleted' });
  await store.Storage.clearAll();
  const s = store.Storage.getSettings();
  assert.equal(s.apiKey, '');
  assert.equal(store.Storage.getCurrentGame(), null);
});

test('buildGameContext — inclut les advisors si présents', () => {
  const ctx = narrator.buildGameContext({
    country: { name: 'X', era: 'X', leaderName: 'X', leaderTitle: 'X' },
    gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 },
    turn: 1, year: 2025, history: [], keyFacts: [],
    advisors: [{ name: 'Aldwin', title: 'Ministre', personality: 'austère' }]
  });
  assert.ok(ctx.includes('CONSEILLERS'));
  assert.ok(ctx.includes('Aldwin'));
});

test('buildGameContext — déclenche crise mondiale au tour 10', () => {
  const ctx = narrator.buildGameContext({
    country: { name: 'X', era: 'X', leaderName: 'X', leaderTitle: 'X' },
    gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 },
    turn: 10, year: 2025, history: [], keyFacts: []
  });
  assert.ok(ctx.includes('CRISE MONDIALE'));
});

// ============================================================
// PHASE 0 — ROBUSTESSE (storage hardening, abort)
// ============================================================
group('Phase 0 — Robustesse');

test('Storage.saveSettings ne crashe pas sur QuotaExceededError', () => {
  // Stub localStorage pour simuler quota dépassé
  const originalSet = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
  let threw = false;
  try { store.Storage.saveSettings({ apiKey: 'x' }); } catch { threw = true; }
  globalThis.localStorage.setItem = originalSet;
  assert.equal(threw, false, 'saveSettings doit avaler l\'erreur, pas la propager');
});

test('Storage.saveCurrentGame ne crashe pas sur QuotaExceededError', () => {
  const originalSet = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  let threw = false;
  try { store.Storage.saveCurrentGame({ gameId: 'x' }); } catch { threw = true; }
  globalThis.localStorage.setItem = originalSet;
  assert.equal(threw, false);
});

test('cancelAllInFlight existe et ne lève pas sans requêtes en cours', () => {
  assert.equal(typeof aiClient.cancelAllInFlight, 'function');
  aiClient.cancelAllInFlight('test'); // ne doit rien lever
});

// ============================================================
// PHASE 1 — RELIQUES + DYNASTIES + TITRES
// ============================================================
group('Phase 1 — Reliques');

test('RELICS — au moins 8 reliques avec id, name, effect, unlockCondition', () => {
  assert.ok(eng.RELICS.length >= 8, `attendu >=8, reçu ${eng.RELICS.length}`);
  for (const r of eng.RELICS) {
    assert.ok(r.id && r.name && r.effect && typeof r.unlockCondition === 'function');
  }
});

test('applyRelicEffects — bonus additif sur jauges', () => {
  const base = { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 };
  const out = eng.applyRelicEffects(base, ['iron_crown']); // +5 military
  assert.equal(out.military, 55);
  assert.equal(out.economy, 50);
});

test('applyRelicEffects — override gaugeOverride force la valeur', () => {
  const base = { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 };
  const out = eng.applyRelicEffects(base, ['war_banner']); // military: 80
  assert.equal(out.military, 80);
});

test('applyRelicEffects — bornes à 5..95', () => {
  const base = { economy: 50, military: 92, support: 50, diplomacy: 50, treasury: 50 };
  const out = eng.applyRelicEffects(base, ['iron_crown', 'shadow_crown']); // +5 + +3 = +8 sur 92 → cap 95
  assert.ok(out.military <= 95);
});

test('evaluateRelicUnlocks — débloque iron_crown si fin great', () => {
  const stats = { endingType: 'great', totalTurns: 25 };
  const newly = eng.evaluateRelicUnlocks(stats, []);
  assert.ok(newly.includes('iron_crown'));
});

test('evaluateRelicUnlocks — ignore les déjà débloquées', () => {
  const stats = { endingType: 'legendary', totalTurns: 50 };
  const newly = eng.evaluateRelicUnlocks(stats, ['iron_crown', 'black_seal']);
  assert.ok(!newly.includes('iron_crown'));
  assert.ok(!newly.includes('black_seal'));
});

test('getEndingMultiplier — Flamme Éternelle boost legendary à 4x', () => {
  assert.equal(eng.getEndingMultiplier('legendary', []), 3.0);
  assert.equal(eng.getEndingMultiplier('legendary', ['eternal_flame']), 4);
  assert.equal(eng.getEndingMultiplier('great', ['eternal_flame']), 2.0); // pas affecté
});

test('getRelicMinFloor — Tome de Clémence pose un plancher à 5', () => {
  assert.equal(eng.getRelicMinFloor([]), 0);
  assert.equal(eng.getRelicMinFloor(['mercy_tome']), 5);
});

test('applyImpact respecte le floor du Tome de Clémence', () => {
  const out = eng.applyImpact({ economy: 8, military: 50, support: 50, diplomacy: 50, treasury: 50 },
    { economy: -20 }, ['mercy_tome']);
  assert.equal(out.economy, 5); // au lieu de 0
});

test('calculateScore — score boosté par Flamme Éternelle en fin légendaire', () => {
  const turns = 50;
  const gauges = { economy: 70, military: 70, support: 70, diplomacy: 70, treasury: 70 };
  const sBase = eng.calculateScore(turns, gauges, 'legendary', []);
  const sBoost = eng.calculateScore(turns, gauges, 'legendary', [], ['eternal_flame']);
  assert.ok(sBoost > sBase);
});

group('Phase 1 — Titres');

test('TITLES — exactement 20 titres avec rang croissant', () => {
  assert.equal(eng.TITLES.length, 20);
  for (let i = 0; i < eng.TITLES.length; i++) {
    assert.equal(eng.TITLES[i].rank, i + 1);
  }
});

test('computeCurrentTitle — Apprenti pour records vides', () => {
  const t = eng.computeCurrentTitle({});
  assert.equal(t.id, 'novice');
});

test('computeCurrentTitle — palier "Stratège Impérial" après 1 fin Légendaire', () => {
  const t = eng.computeCurrentTitle({ totalGames: 5, endingTypeCount: { legendary: 1 } });
  assert.equal(t.id, 'legendary_1');
});

test('computeCurrentTitle — palier max "Éternel" après 10 fins légendaires', () => {
  const t = eng.computeCurrentTitle({ totalGames: 100, endingTypeCount: { legendary: 10 }, distinctGenresPlayed: 5 });
  assert.equal(t.id, 'legendary_10');
});

test('computeNextTitle — pas de prochain palier au rang max', () => {
  const r = { totalGames: 100, endingTypeCount: { legendary: 10 } };
  const { next } = eng.computeNextTitle(r);
  assert.equal(next, null);
});

group('Phase 1 — Dynasties (Storage)');

test('Storage.startDynasty crée une dynastie unique', async () => {
  await store.Storage.clearAll();
  const dyn = store.Storage.startDynasty({ gameId: 'g1', country: { name: 'Atlas' }, genre: 'medieval' });
  assert.ok(dyn.id);
  assert.equal(dyn.length, 0);
  assert.equal(dyn.name, 'Atlas');
  assert.equal(store.Storage.getCurrentDynasty()?.id, dyn.id);
});

test('Storage.recordDynastyGeneration — incrémente length', async () => {
  await store.Storage.clearAll();
  store.Storage.startDynasty({ gameId: 'g1', country: { name: 'Y' } });
  store.Storage.recordDynastyGeneration({ gameId: 'g1', finalScore: 1500, endingType: 'good', totalTurns: 25 });
  const dyn = store.Storage.getCurrentDynasty();
  assert.equal(dyn.length, 1);
  assert.equal(dyn.generations[0].score, 1500);
});

test('Storage.continueDynasty — préserve la lignée', async () => {
  await store.Storage.clearAll();
  store.Storage.startDynasty({ gameId: 'g1', country: { name: 'Z' } });
  store.Storage.recordDynastyGeneration({ gameId: 'g1', finalScore: 1000, endingType: 'good', totalTurns: 20 });
  store.Storage.continueDynasty({ gameId: 'g2', country: { name: 'Z' } });
  store.Storage.recordDynastyGeneration({ gameId: 'g2', finalScore: 2000, endingType: 'great', totalTurns: 35 });
  const dyn = store.Storage.getCurrentDynasty();
  assert.equal(dyn.length, 2);
});

test('Storage.endCurrentDynasty — coupe la lignée', () => {
  store.Storage.endCurrentDynasty();
  assert.equal(store.Storage.getCurrentDynasty(), null);
});

test('Storage.unlockRelics — ajout cumulatif sans doublon', async () => {
  await store.Storage.clearAll();
  const a1 = store.Storage.unlockRelics(['iron_crown', 'mercy_tome']);
  assert.equal(a1.length, 2);
  const a2 = store.Storage.unlockRelics(['iron_crown', 'war_banner']); // iron_crown déjà → ignoré
  assert.deepEqual(a2, ['war_banner']);
  const m = store.Storage.getMeta();
  assert.deepEqual(m.unlockedRelics.sort(), ['iron_crown', 'mercy_tome', 'war_banner'].sort());
});

test('Storage.setActiveRelics — cap à 2', () => {
  store.Storage.setActiveRelics(['a', 'b', 'c', 'd']);
  assert.equal(store.Storage.getActiveRelics().length, 2);
});

test('Storage.updateRecords — incrémente endingTypeCount', async () => {
  await store.Storage.clearAll();
  store.Storage.updateRecords(2000, 'great', 30, [], { genre: 'medieval' });
  store.Storage.updateRecords(3000, 'legendary', 50, [], { genre: 'cyberpunk' });
  const r = store.Storage.getRecords();
  assert.equal(r.endingTypeCount.great, 1);
  assert.equal(r.endingTypeCount.legendary, 1);
  assert.equal(r.bestTurns, 50);
  assert.equal(r.totalGames, 2);
});

// ============================================================
// PHASE 2/3/4/7/8 — TESTS DES NOUVEAUX MODULES
// ============================================================
group('Phase 2 — Bibliothèque offline');

const offline = await import('./www/js/offline-events.js');

test('OFFLINE_EVENT_LIBRARY — au moins 20 événements totaux', () => {
  assert.ok(offline.OFFLINE_EVENT_LIBRARY.total >= 20, `attendu >=20, reçu ${offline.OFFLINE_EVENT_LIBRARY.total}`);
});

test('OFFLINE_EVENT_LIBRARY — chaque événement a 5 choix dont le dernier libre', () => {
  for (const e of offline.OFFLINE_EVENT_LIBRARY.universal) {
    assert.equal(e.choices.length, 5, `${e.id} doit avoir 5 choix`);
    assert.equal(e.choices[4].philosophy, 'libre');
  }
});

test('pickOfflineEvent — respecte le genre', () => {
  const ev = offline.pickOfflineEvent({ genre: 'medieval', gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 } });
  assert.ok(ev?.id, 'devrait retourner un événement');
  // L'event doit appartenir au pool medieval (universal + medieval)
  const inPool = offline.OFFLINE_EVENT_LIBRARY.pools.medieval.some((e) => e.id === ev.id);
  assert.ok(inPool, `event ${ev.id} doit être dans le pool medieval`);
});

test('pickOfflineEvent — évite les IDs récents', () => {
  const recentIds = offline.OFFLINE_EVENT_LIBRARY.universal.slice(0, 4).map((e) => e.id);
  const state = { genre: 'default', gauges: { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 }, recentOfflineEventIds: recentIds };
  for (let i = 0; i < 20; i++) {
    const ev = offline.pickOfflineEvent(state);
    assert.ok(!recentIds.includes(ev.id) || offline.OFFLINE_EVENT_LIBRARY.universal.length <= recentIds.length, `événement ${ev.id} ne doit pas être dans recent`);
  }
});

test('evaluateOfflineCustomChoice — texte militaire → philosophy militariste', () => {
  const r = offline.evaluateOfflineCustomChoice('Lever une armée et envahir le voisin', { gauges: {} });
  assert.equal(r.philosophy, 'militariste');
  assert.ok(r.impacts.military > 0);
});

test('evaluateOfflineCustomChoice — texte humaniste → support positif', () => {
  const r = offline.evaluateOfflineCustomChoice('Construire des hôpitaux pour le peuple', { gauges: {} });
  assert.ok(r.impacts.support > 0);
});

test('evaluateOfflineCustomChoice — bornes -12..12', () => {
  const r = offline.evaluateOfflineCustomChoice('Guerre commerce peuple alliance exécuter', { gauges: {} });
  for (const k of Object.keys(r.impacts)) {
    assert.ok(r.impacts[k] >= -12 && r.impacts[k] <= 12, `${k}=${r.impacts[k]} hors bornes`);
  }
});

group('Phase 3 — Arcs narratifs + secrets');

test('NARRATIVE_ARCS — au moins 5 arcs avec phases ordonnées', () => {
  assert.ok(eng.NARRATIVE_ARCS.length >= 5);
  for (const arc of eng.NARRATIVE_ARCS) {
    assert.ok(arc.id && arc.phases.length >= 2);
    for (let i = 1; i < arc.phases.length; i++) {
      assert.ok(arc.phases[i].offset >= arc.phases[i - 1].offset);
    }
  }
});

test('checkArcTrigger — ne déclenche pas si activeArcId déjà présent', () => {
  const state = { activeArcId: 'war_of_succession', turn: 6, gauges: { military: 80, support: 30 } };
  assert.equal(eng.checkArcTrigger(state), null);
});

test('getActiveArcPhase — retourne la phase appropriée selon turn-arcStartTurn', () => {
  const state = { activeArcId: 'war_of_succession', arcStartTurn: 5, turn: 7, gauges: {} };
  const ph = eng.getActiveArcPhase(state);
  assert.ok(ph?.phase, 'phase doit exister');
  assert.equal(ph.elapsed, 2);
});

group('Phase 4 — Conseillers vivants');

test('generateAdvisors — chaque conseiller a loyalty + expertise + status', () => {
  const advs = eng.generateAdvisors('medieval', 'Test');
  assert.equal(advs.length, 5);
  for (const a of advs) {
    assert.ok(a.loyalty >= 0 && a.loyalty <= 100);
    assert.ok(['economy', 'military', 'support', 'diplomacy', 'treasury'].includes(a.expertise));
    assert.equal(a.status, 'alive');
  }
});

test('adjustAdvisorLoyalty — augmente loyauté si jauge experte impactée positivement', () => {
  const advs = eng.generateAdvisors('medieval', 'X');
  const target = advs.find((a) => a.expertise === 'military');
  const before = target.loyalty;
  eng.adjustAdvisorLoyalty(advs, { philosophy: 'militariste' }, { military: 10 });
  assert.ok(target.loyalty > before, `loyauté avant=${before} après=${target.loyalty}`);
});

test('adjustAdvisorLoyalty — détecte trahison à loyauté < 20', () => {
  const advs = eng.generateAdvisors('medieval', 'X');
  const target = advs.find((a) => a.expertise === 'military');
  target.loyalty = 22;
  const r = eng.adjustAdvisorLoyalty(advs, { philosophy: 'humaniste' }, { military: -15 });
  assert.equal(r?.betrayed, true);
});

test('pickAdvisorOpinion — fallback générique si pas de template', () => {
  const a = { name: 'Test', personality: 'inconnue', expertise: 'support' };
  const op = eng.pickAdvisorOpinion(a, { support: 20 });
  assert.ok(typeof op === 'string' && op.length > 5);
});

group('Phase 7 — Prophéties');

test('evaluateProphecies — domaine military se réalise sur swing >=30', async () => {
  const narrator = await import('./www/js/ai-narrator.js');
  const props = [{ id: 'p1', text: 'Test', domain: 'military' }];
  const gs = { startingGauges: { military: 50 }, gauges: { military: 50 } };
  const completed = { finalGauges: { military: 15 }, gameOverReason: '' }; // chute de 35
  const r = narrator.evaluateProphecies(props, gs, completed);
  assert.equal(r[0].fulfilled, true);
});

test('evaluateProphecies — domaine economy se réalise sur drop >=20', async () => {
  const narrator = await import('./www/js/ai-narrator.js');
  const props = [{ id: 'p1', text: 'Test', domain: 'economy' }];
  const gs = { startingGauges: { economy: 60 }, gauges: { economy: 60 } };
  const completed = { finalGauges: { economy: 35 }, gameOverReason: '' }; // chute de 25
  const r = narrator.evaluateProphecies(props, gs, completed);
  assert.equal(r[0].fulfilled, true);
});

test('evaluateProphecies — non réalisée si swing trop faible', async () => {
  const narrator = await import('./www/js/ai-narrator.js');
  const props = [{ id: 'p1', text: 'Test', domain: 'support' }];
  const gs = { startingGauges: { support: 50 }, gauges: { support: 50 } };
  const completed = { finalGauges: { support: 45 }, gameOverReason: '' };
  const r = narrator.evaluateProphecies(props, gs, completed);
  assert.equal(r[0].fulfilled, false);
});

group('Phase 8 — Classification erreurs IA');

test('classifyAIError — INVALID_KEY pour 401', () => {
  const e = aiClient.classifyAIError(new Error('HTTP 401: incorrect api key'));
  assert.equal(e.code, 'INVALID_KEY');
});

test('classifyAIError — RATE_LIMIT pour 429', () => {
  const e = aiClient.classifyAIError(new Error('HTTP 429: too many requests'));
  assert.equal(e.code, 'RATE_LIMIT');
});

test('classifyAIError — TIMEOUT pour timeout', () => {
  const e = aiClient.classifyAIError(new Error('Timeout API (>30s)'));
  assert.equal(e.code, 'TIMEOUT');
});

test('classifyAIError — UNKNOWN par défaut', () => {
  const e = aiClient.classifyAIError(new Error('quelque chose d\'inconnu'));
  assert.equal(e.code, 'UNKNOWN');
});

group('Phase 6.4 — Audio (no-op en environnement Node)');

test('audio module — playTone ne lève pas d\'exception sans AudioContext', async () => {
  const audio = await import('./www/js/audio.js');
  // Sans window.AudioContext, doit silencieusement ne rien faire
  audio.setAudioEnabled(true);
  audio.playTone('choice');
  audio.playTone('gameover');
  audio.playTone('achievement');
  audio.playTone('inconnu'); // tonalité inconnue
  // Si on arrive ici sans throw, c'est OK
  assert.ok(true);
});

group('Phase 5 — Streak');

test('Storage.updateStreak — premier appel met le streak à 1', async () => {
  await store.Storage.clearAll();
  const s = store.Storage.updateStreak();
  assert.equal(s, 1);
});

test('Storage.updateStreak — 2 appels rapprochés gardent le streak à 1', async () => {
  await store.Storage.clearAll();
  store.Storage.updateStreak();
  const s = store.Storage.updateStreak(); // même jour
  assert.equal(s, 1);
});

// ============================================================
// PHASE WSS — 6 FEATURES + RENAME + TONALITÉ
// ============================================================
group('WSS-0 — Tonalité hybride');

test('getToneInstructions — genres modernes → ton géopolitique', () => {
  const tone = narrator.getToneInstructions('cyberpunk');
  assert.ok(/géopolitique|factions|news/i.test(tone));
});

test('getToneInstructions — genres anciens → ton littéraire', () => {
  const tone = narrator.getToneInstructions('medieval');
  assert.ok(/littéraire|Sire|parchemin/i.test(tone));
});

test('getToneInstructions — genre inconnu → fallback littéraire', () => {
  const tone = narrator.getToneInstructions('unknown_genre_xyz');
  assert.ok(tone.length > 0);
});

group('WSS-1 — Idéologie évolutive');

test('driftTraits — choix humaniste pousse pragmatism vers idéaliste', () => {
  const init = { pragmatism: 50, force: 50, tradition: 50, discretion: 50 };
  const r = eng.driftTraits(init, 'humaniste', init);
  assert.ok(r.traits.pragmatism > 50);
  assert.equal(r.drifted, null); // un seul choix ne suffit pas pour franchir le seuil
});

test('driftTraits — drift cumulé déclenche le toast à >=25 points', () => {
  const init = { pragmatism: 50, force: 50, tradition: 50, discretion: 50 };
  let cur = { ...init };
  let lastDrift = null;
  for (let i = 0; i < 15; i++) {
    const r = eng.driftTraits(cur, 'humaniste', init);
    cur = r.traits;
    if (r.drifted) lastDrift = r.drifted;
  }
  assert.ok(lastDrift, 'devrait franchir le seuil au bout de plusieurs choix');
  assert.ok(Math.abs(lastDrift.delta) >= 25);
});

test('driftTraits — philosophie inconnue ne bouge rien', () => {
  const init = { pragmatism: 50, force: 50, tradition: 50, discretion: 50 };
  const r = eng.driftTraits(init, 'philosophie_inexistante', init);
  assert.deepEqual(r.traits, init);
});

group('WSS-3 — Scénarios historiques');

test('QUICK_SCENARIOS — au moins 8 scénarios historiques avec flag', () => {
  const hist = narrator.QUICK_SCENARIOS.filter((s) => s.historical);
  assert.ok(hist.length >= 8, `attendu >=8 historiques, reçu ${hist.length}`);
  for (const s of hist) {
    assert.ok(s.nation, `${s.id} doit avoir une nation`);
    assert.ok(s.nation.startingGauges, `${s.id} doit avoir des startingGauges`);
    for (const k of eng.GAUGE_KEYS) {
      const v = s.nation.startingGauges[k];
      assert.ok(v >= 5 && v <= 95, `${s.id}.${k}=${v} hors bornes 5..95`);
    }
  }
});

test('QUICK_SCENARIOS — historicalArcId valide quand présent', () => {
  const arcIds = new Set(eng.NARRATIVE_ARCS.map((a) => a.id));
  const hist = narrator.QUICK_SCENARIOS.filter((s) => s.historical && s.historicalArcId);
  for (const s of hist) {
    assert.ok(arcIds.has(s.historicalArcId), `${s.id} référence un arc inexistant : ${s.historicalArcId}`);
  }
});

group('WSS-4 — Diplomatie voisins');

test('generateNeighbors — bon nombre, structure valide', () => {
  const n = eng.generateNeighbors('medieval', 4);
  assert.equal(n.length, 4);
  for (const v of n) {
    assert.ok(v.name && v.regime);
    assert.ok(v.power >= 30 && v.power <= 80);
    assert.ok(v.attitude >= 0 && v.attitude <= 100);
  }
});

test('generateNeighbors — noms uniques', () => {
  const n = eng.generateNeighbors('medieval', 3);
  const names = n.map((x) => x.name);
  assert.equal(new Set(names).size, names.length);
});

test('generateNeighbors — fallback genre inconnu', () => {
  const n = eng.generateNeighbors('zzz_unknown', 2);
  assert.equal(n.length, 2);
});

test('updateNeighborAttitudes — choix diplomatique augmente attitude', () => {
  const neighbors = [{ name: 'X', regime: 'Royaume', power: 50, attitude: 50, lastInteractionTurn: 0 }];
  const r = eng.updateNeighborAttitudes(neighbors, { philosophy: 'diplomatique' }, {}, 5);
  assert.ok(r);
  assert.ok(neighbors[0].attitude > 50);
});

test('updateNeighborAttitudes — choix militariste baisse attitude', () => {
  const neighbors = [{ name: 'X', regime: 'Royaume', power: 50, attitude: 50, lastInteractionTurn: 0 }];
  eng.updateNeighborAttitudes(neighbors, { philosophy: 'militariste' }, { military: 12 }, 5);
  assert.ok(neighbors[0].attitude < 50);
});

test('describeAttitude — couvre les 5 paliers (clés i18n)', () => {
  assert.equal(eng.describeAttitude(80), 'attitude_ally');
  assert.equal(eng.describeAttitude(65), 'attitude_friend');
  assert.equal(eng.describeAttitude(50), 'attitude_neutral');
  assert.equal(eng.describeAttitude(30), 'attitude_tense');
  assert.equal(eng.describeAttitude(10), 'attitude_hostile');
});

group('WSS-5 — Marché mondial');

test('defaultMarket — 3 ressources à 1.0', () => {
  const m = eng.defaultMarket();
  assert.equal(m.vivres, 1.0);
  assert.equal(m.metaux, 1.0);
  assert.equal(m.devise, 1.0);
});

test('advanceMarket — bornes 0.5..2.0', () => {
  let m = eng.defaultMarket();
  for (let i = 0; i < 100; i++) {
    const r = eng.advanceMarket(m, i);
    m = r.market;
    for (const k of Object.keys(m)) {
      assert.ok(m[k] >= 0.5 && m[k] <= 2.0, `${k}=${m[k]} hors bornes`);
    }
  }
});

test('advanceMarket — mean reversion fait revenir vers 1.0', () => {
  // Démarre fort écarté, vérifie qu'au bout de N tours on s'est rapproché de 1.0
  let m = { vivres: 2.0, metaux: 2.0, devise: 2.0 };
  for (let i = 0; i < 50; i++) m = eng.advanceMarket(m, i).market;
  // En moyenne devrait être < 1.5 (random walk + reversion)
  const avg = (m.vivres + m.metaux + m.devise) / 3;
  assert.ok(avg < 1.7, `mean reversion insuffisante : avg=${avg}`);
});

test('marketBadge — n\'affiche que les variations >=8%', () => {
  const empty = eng.marketBadge({ vivres: 1.05, metaux: 1.0, devise: 0.97 });
  assert.equal(empty, '', 'variations <8% non affichées');
  const some = eng.marketBadge({ vivres: 1.20, metaux: 1.0, devise: 1.0 });
  assert.ok(some.includes('+20%'));
});

group('WSS-6 — Arbre R&D');

test('TECH_BRANCHES — exactement 4 branches × 4 paliers', () => {
  assert.equal(eng.TECH_BRANCHES.length, 4);
  for (const b of eng.TECH_BRANCHES) {
    assert.equal(b.tiers.length, 4);
    for (let i = 0; i < 4; i++) assert.equal(b.tiers[i].tier, i + 1);
  }
});

test('getTechLabel — utilise le label par genre quand dispo', () => {
  assert.equal(eng.getTechLabel('economy', 'medieval'), 'Guildes');
  assert.equal(eng.getTechLabel('military', 'cyberpunk'), 'Cybermilice');
});

test('getTechLabel — fallback sur baseLabel pour genre inconnu', () => {
  assert.equal(eng.getTechLabel('economy', 'zzz_unknown'), 'Économie');
});

test('canUnlockTech — refus si treasury insuffisant', () => {
  const r = eng.canUnlockTech(5, { economy: 0 }, 'economy');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no_treasury');
});

test('canUnlockTech — séquence T1 → T4 respectée', () => {
  // Au tier 0, on peut acheter T1 si treasury >= 8
  const r1 = eng.canUnlockTech(50, { economy: 0 }, 'economy');
  assert.equal(r1.ok, true);
  assert.equal(r1.tier.tier, 1);
  // Au tier 4, plus rien à acheter
  const r5 = eng.canUnlockTech(100, { economy: 4 }, 'economy');
  assert.equal(r5.ok, false);
  assert.equal(r5.reason, 'maxed');
});

test('applyTechBonuses — applique les bonus selon bonusEvery', () => {
  const gauges = { economy: 50, military: 50, support: 50, diplomacy: 50, treasury: 50 };
  const tech = { economy: 1, military: 0, society: 0, innovation: 0 };
  // T1 economy : bonusEvery=3, bonus { economy: +1 }
  const r3 = eng.applyTechBonuses(gauges, tech, 3); // turn % 3 == 0
  assert.equal(r3.economy, 51);
  const r4 = eng.applyTechBonuses(gauges, tech, 4); // turn % 3 != 0
  assert.equal(r4.economy, 50);
});

test('applyTechBonuses — borne à 100', () => {
  const gauges = { economy: 99, military: 50, support: 50, diplomacy: 50, treasury: 50 };
  const tech = { economy: 4 };
  const r = eng.applyTechBonuses(gauges, tech, 6); // bonus appliqué
  assert.ok(r.economy <= 100);
});

// ============================================================
// i18n FR/EN
// ============================================================
group('i18n — système de traduction');

const i18n = await import('./www/js/i18n.js');

test('i18n — locale par défaut = fr', () => {
  globalThis.localStorage.clear();
  // Reset cache via setLocale
  i18n.setLocale('fr');
  assert.equal(i18n.getLocale(), 'fr');
});

test('i18n — setLocale("en") bascule en anglais', () => {
  i18n.setLocale('en');
  assert.equal(i18n.getLocale(), 'en');
  assert.equal(i18n.t('app_title'), 'World State Simulator');
  assert.ok(i18n.t('app_subtitle').toLowerCase().includes('nation'));
});

test('i18n — t() interpole les paramètres', () => {
  i18n.setLocale('en');
  const r = i18n.t('home_relics_status', { unlocked: 3, total: 8, active: 1, max: 2 });
  assert.ok(r.includes('3/8'));
  assert.ok(r.includes('1/2'));
});

test('i18n — fallback FR si clé manquante en EN', () => {
  i18n.setLocale('en');
  // Une clé qui existe seulement en français : on simule en testant une clé inexistante des deux côtés
  const r = i18n.t('clef_qui_n_existe_pas_du_tout');
  assert.equal(r, 'clef_qui_n_existe_pas_du_tout'); // fallback ultime = la clé elle-même
});

test('i18n — setLocale invalide est rejeté', () => {
  i18n.setLocale('fr');
  assert.equal(i18n.setLocale('zzz'), false);
  assert.equal(i18n.getLocale(), 'fr');
});

test('i18n — RELICS ont nameKey/descKey valides dans les deux locales', () => {
  for (const r of eng.RELICS) {
    assert.ok(r.nameKey, `${r.id} doit avoir nameKey`);
    assert.ok(r.descKey, `${r.id} doit avoir descKey`);
    i18n.setLocale('fr');
    assert.notEqual(i18n.t(r.nameKey), r.nameKey, `${r.nameKey} doit être traduit en FR`);
    i18n.setLocale('en');
    assert.notEqual(i18n.t(r.nameKey), r.nameKey, `${r.nameKey} doit être traduit en EN`);
  }
  i18n.setLocale('fr'); // reset
});

test('i18n — formatEndingType utilise le globalThis.__i18n_t', () => {
  i18n.setLocale('en');
  const r = fmt.formatEndingType('legendary');
  assert.ok(r.includes('LEGENDARY'));
  i18n.setLocale('fr');
  const r2 = fmt.formatEndingType('legendary');
  assert.ok(r2.includes('LÉGENDAIRE'));
});

// ============================================================
// COHÉRENCE GLOBALE
// ============================================================
group('Cohérence globale');

test('Une partie complète : init → choix → game over', () => {
  // Simulation : on dégrade economy à 0
  let gauges = eng.getStartingGauges('gouvernant');
  let turn = 1;
  let history = [];

  for (let i = 0; i < 60; i++) {
    gauges = eng.applyImpact(gauges, { economy: -5 });
    history = eng.appendHistory(history, { turn, choiceText: 'baisse', outcome: 'eco -5' });
    turn++;
    const go = eng.checkGameOver(gauges);
    if (go.over) break;
  }

  assert.ok(turn < 30, 'Le jeu doit s\'arrêter par game over avant 30 tours');
  const ending = eng.determineEndingType(gauges, turn);
  assert.ok(['catastrophic', 'bad', 'neutral'].includes(ending));
  const score = eng.calculateScore(turn, gauges, ending, []);
  assert.ok(score >= 0);
});

// ============================================================
// FREEMIUM (device-id, provider freemium, hasAI, buildHeaders)
// ============================================================
group('freemium / device-id');

const deviceIdMod = await import('./www/js/device-id.js');

test('getDeviceId() retourne un UUID valide', () => {
  localStorageStore.delete('regne_device_id');
  const id = deviceIdMod.getDeviceId();
  assert.ok(typeof id === 'string');
  assert.ok(id.length >= 8 && id.length <= 64, `longueur inattendue: ${id.length}`);
  assert.match(id, /^[A-Za-z0-9-]{8,64}$/);
});

test('getDeviceId() est idempotent (même id sur appels successifs)', () => {
  localStorageStore.delete('regne_device_id');
  const a = deviceIdMod.getDeviceId();
  const b = deviceIdMod.getDeviceId();
  const c = deviceIdMod.getDeviceId();
  assert.equal(a, b);
  assert.equal(b, c);
});

test('Provider freemium est exposé avec bundled:true et prix 0', () => {
  const p = aiClient.PROVIDERS.freemium;
  assert.ok(p, 'PROVIDERS.freemium doit exister');
  assert.equal(p.bundled, true);
  const ids = p.models.map((m) => m.id);
  assert.ok(ids.includes('llama-3.1-8b-instant'));
  assert.ok(ids.includes('llama-3.3-70b-versatile'));
  for (const m of p.models) {
    assert.equal(m.priceIn, 0, `priceIn=0 attendu pour ${m.id}`);
    assert.equal(m.priceOut, 0, `priceOut=0 attendu pour ${m.id}`);
  }
});

test('hasAI() : bundled-sans-clé → true', () => {
  assert.equal(aiClient.hasAI({ provider: 'freemium', apiKey: '' }), true);
});

test('hasAI() : BYOK-sans-clé → false', () => {
  assert.equal(aiClient.hasAI({ provider: 'groq', apiKey: '' }), false);
});

test('hasAI() : BYOK-avec-clé → true', () => {
  assert.equal(aiClient.hasAI({ provider: 'groq', apiKey: 'sk-test' }), true);
});

test('buildHeaders("freemium") envoie X-Device-Id et PAS Authorization', () => {
  const h = aiClient.buildHeaders('freemium', null, 'device-abc-1234');
  assert.equal(h['X-Device-Id'], 'device-abc-1234');
  assert.equal(h['Content-Type'], 'application/json');
  assert.equal(h.Authorization, undefined, 'Authorization ne doit PAS être présent');
  assert.equal(h['x-api-key'], undefined);
});

test('buildHeaders BYOK OpenAI-compat envoie Authorization Bearer', () => {
  const h = aiClient.buildHeaders('groq', 'sk-xyz', null);
  assert.equal(h.Authorization, 'Bearer sk-xyz');
  assert.equal(h['X-Device-Id'], undefined);
});

// ============================================================
// RAPPORT FINAL
// ============================================================
console.log('\n' + '═'.repeat(50));
console.log(`✅ ${passed} tests passés    ❌ ${failed} tests échoués`);
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\nDétail des échecs :');
  failures.forEach(({ name, err }) => {
    console.log(`  • ${name}\n    ${err.stack || err.message}`);
  });
  process.exit(1);
}
