// EMA cross — port of bot.py:175-199
import { ema } from './indicators.js';

export async function emaCrossStrategy(closes, params) {
  const fast = params.fast ?? 9;
  const slow = params.slow ?? 21;
  const trend = params.trend ?? 50;
  const min = Math.max(slow, trend) + 2;
  if (closes.length < min) {
    return { signal: 'none', confidence: 0, reason: 'données insuffisantes', metadata: {} };
  }

  const fastSeries = ema(closes, fast);
  const slowSeries = ema(closes, slow);
  const trendSeries = ema(closes, trend);

  const f = fastSeries.at(-1);
  const s = slowSeries.at(-1);
  const t = trendSeries.at(-1);
  const pf = fastSeries.at(-2);
  const ps = slowSeries.at(-2);
  const price = closes.at(-1);

  const meta = {
    fast: round(f), slow: round(s), trend: round(t), price: round(price),
  };

  // Crossover detection
  const crossedUp = pf <= ps && f > s;
  const crossedDown = pf >= ps && f < s;

  if (crossedUp && price > t) {
    return { signal: 'long', confidence: 0.75, reason: `EMA${fast}↑${slow} avec tendance haussière`, metadata: meta };
  }
  if (crossedDown && price < t) {
    return { signal: 'short', confidence: 0.75, reason: `EMA${fast}↓${slow} avec tendance baissière`, metadata: meta };
  }
  if (f > s && price > t) {
    return { signal: 'long', confidence: 0.40, reason: 'EMA alignées haussières', metadata: meta };
  }
  if (f < s && price < t) {
    return { signal: 'short', confidence: 0.40, reason: 'EMA alignées baissières', metadata: meta };
  }
  return { signal: 'none', confidence: 0, reason: 'pas d\'alignement', metadata: meta };
}

function round(x) { return Number.isFinite(x) ? Number(x.toFixed(2)) : 0; }
