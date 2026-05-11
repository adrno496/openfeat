// Bollinger Bands — port of bot.py:244-265
import { bollinger } from './indicators.js';

export async function bollingerStrategy(closes, params) {
  const period = params.period ?? 20;
  const stdDev = params.stdDev ?? 2.0;
  if (closes.length < period + 2) {
    return { signal: 'none', confidence: 0, reason: 'données insuffisantes', metadata: {} };
  }

  const bb = bollinger(closes, period, stdDev);
  const bbPrev = bollinger(closes.slice(0, -1), period, stdDev);
  const price = closes.at(-1);
  const prev = closes.at(-2);
  const meta = {
    upper: round(bb.upper),
    mid: round(bb.mid),
    lower: round(bb.lower),
    width: Number(bb.width.toFixed(4)),
    price: round(price),
  };

  // Squeeze (width < 2%) → low confidence neutral signal pending breakout
  if (bb.width < 0.02) {
    return { signal: 'none', confidence: 0.30, reason: `compression des bandes (${(bb.width * 100).toFixed(2)}%)`, metadata: meta };
  }

  // Rebound off lower band
  if (prev < bbPrev.lower && price >= bb.lower) {
    return { signal: 'long', confidence: 0.75, reason: 'rebond sur bande inférieure', metadata: meta };
  }
  // Rejection at upper band
  if (prev > bbPrev.upper && price <= bb.upper) {
    return { signal: 'short', confidence: 0.75, reason: 'rejet de la bande supérieure', metadata: meta };
  }
  // Still beyond bands
  if (price < bb.lower) {
    return { signal: 'long', confidence: 0.55, reason: 'prix sous la bande inférieure', metadata: meta };
  }
  if (price > bb.upper) {
    return { signal: 'short', confidence: 0.55, reason: 'prix au-dessus de la bande supérieure', metadata: meta };
  }
  return { signal: 'none', confidence: 0, reason: 'dans le canal', metadata: meta };
}

function round(x) { return Number.isFinite(x) ? Number(x.toFixed(2)) : 0; }
