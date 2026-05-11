// lib/usage.js — Suivi de la consommation API : tokens, coûts estimés, historique
const fs = require('fs');
const { dataFile } = require('./paths');

const USAGE_FILE = dataFile('usage.json');

// Prix indicatifs USD par 1M tokens (input / output) — à ajuster si les providers changent.
// cache_read = ~10% du prix input pour Anthropic.
const PRICING = {
  // Anthropic Claude
  'claude-haiku-4-5':   { input: 0.25, output: 1.25, cached: 0.025 },
  'claude-sonnet-4-6':  { input: 3.0,  output: 15.0, cached: 0.30 },
  'claude-opus-4-7':    { input: 15.0, output: 75.0, cached: 1.50 },
  // OpenAI
  'gpt-4o-mini':        { input: 0.15, output: 0.60 },
  'gpt-4o':             { input: 2.50, output: 10.0 },
  // Gemini
  'gemini-2.0-flash':   { input: 0.075, output: 0.30 },
  'gemini-2.5-flash':   { input: 0.30,  output: 2.50 },
  'gemini-2.5-pro':     { input: 1.25,  output: 10.0 },
  // Mistral
  'ministral-8b-latest':       { input: 0.10, output: 0.10 },
  'mistral-medium-latest':     { input: 0.40, output: 2.00 },
  'mistral-large-latest':      { input: 2.00, output: 6.00 },
  // DeepSeek
  'deepseek-chat':      { input: 0.14, output: 0.28 },
  'deepseek-reasoner':  { input: 0.55, output: 2.19 },
  // Groq
  'llama-3.1-8b-instant':       { input: 0.05, output: 0.08 },
  'llama-3.3-70b-versatile':    { input: 0.59, output: 0.79 }
};

function defaultUsage() {
  return {
    totals: { calls: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUSD: 0 },
    byProvider: {},
    byModule: {},
    byDay: {},
    history: [], // 100 derniers
    startedAt: new Date().toISOString()
  };
}

function load() {
  try {
    if (!fs.existsSync(USAGE_FILE)) return defaultUsage();
    const raw = fs.readFileSync(USAGE_FILE, 'utf8');
    const data = JSON.parse(raw);
    // sanity merge
    return { ...defaultUsage(), ...data };
  } catch {
    return defaultUsage();
  }
}

function save(data) {
  try { fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('[usage] save error:', e.message); }
}

function computeCost(model, input, output, cached = 0) {
  const p = PRICING[model];
  if (!p) return 0;
  const realInput = Math.max(0, input - cached);
  const cost = (realInput * p.input + output * p.output + cached * (p.cached || p.input * 0.1)) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 décimales
}

function record({ provider, model, module: moduleId, inputTokens = 0, outputTokens = 0, cachedTokens = 0 }) {
  if (!provider || !model) return;
  const data = load();
  const cost = computeCost(model, inputTokens, outputTokens, cachedTokens);
  const day = new Date().toISOString().split('T')[0];

  // Totals
  data.totals.calls += 1;
  data.totals.inputTokens += inputTokens;
  data.totals.outputTokens += outputTokens;
  data.totals.cachedTokens += cachedTokens;
  data.totals.costUSD += cost;

  // Par provider
  if (!data.byProvider[provider]) data.byProvider[provider] = { calls: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUSD: 0 };
  const p = data.byProvider[provider];
  p.calls++; p.inputTokens += inputTokens; p.outputTokens += outputTokens; p.cachedTokens += cachedTokens; p.costUSD += cost;

  // Par module
  if (moduleId) {
    if (!data.byModule[moduleId]) data.byModule[moduleId] = { calls: 0, costUSD: 0 };
    data.byModule[moduleId].calls++; data.byModule[moduleId].costUSD += cost;
  }

  // Par jour
  if (!data.byDay[day]) data.byDay[day] = { calls: 0, costUSD: 0 };
  data.byDay[day].calls++; data.byDay[day].costUSD += cost;

  // Historique (FIFO 100)
  data.history.push({
    at: new Date().toISOString(),
    provider, model, module: moduleId || '',
    inputTokens, outputTokens, cachedTokens, costUSD: cost
  });
  if (data.history.length > 100) data.history = data.history.slice(-100);

  save(data);
  return { cost, totalCost: data.totals.costUSD };
}

function reset() {
  save(defaultUsage());
}

function getStats() {
  return load();
}

module.exports = { record, reset, getStats, computeCost, PRICING };
