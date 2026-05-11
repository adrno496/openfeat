// VWAP — new strategy added by the build spec.
// Long if price is meaningfully above session VWAP and momentum is positive.
// Short if meaningfully below and momentum is negative.
import { vwap } from './indicators.js';

export async function vwapStrategy(candles, params) {
  const dev = (params.deviationPct ?? 1.5) / 100;
  if (candles.length < 20) {
    return { signal: 'none', confidence: 0, reason: 'données insuffisantes', metadata: {} };
  }
  const v = vwap(candles);
  const closes = candles.map((c) => parseFloat(c.c));
  const price = closes.at(-1);
  const prev = closes.at(-2);
  const ratio = price / v;
  const meta = {
    vwap: Number(v.toFixed(2)),
    price: Number(price.toFixed(2)),
    deviationPct: Number(((ratio - 1) * 100).toFixed(2)),
  };

  // Clean breakout (above VWAP + threshold) with up momentum
  if (price > v * (1 + dev) && price >= prev) {
    return { signal: 'long', confidence: 0.65, reason: `prix > VWAP +${(dev * 100).toFixed(1)}%`, metadata: meta };
  }
  if (price < v * (1 - dev) && price <= prev) {
    return { signal: 'short', confidence: 0.65, reason: `prix < VWAP -${(dev * 100).toFixed(1)}%`, metadata: meta };
  }
  // Touched VWAP from above (potential reversal)
  if (price > v && price < v * (1 + dev)) {
    return { signal: 'long', confidence: 0.40, reason: 'support sur VWAP', metadata: meta };
  }
  if (price < v && price > v * (1 - dev)) {
    return { signal: 'short', confidence: 0.40, reason: 'résistance sur VWAP', metadata: meta };
  }
  return { signal: 'none', confidence: 0, reason: 'au-dessus/sous VWAP sans signal net', metadata: meta };
}
