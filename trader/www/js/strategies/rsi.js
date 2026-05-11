// RSI — port of bot.py:202-220
import { rsi } from './indicators.js';

export async function rsiStrategy(closes, params) {
  const period = params.period ?? 14;
  const oversold = params.oversold ?? 30;
  const overbought = params.overbought ?? 70;
  if (closes.length < period + 2) {
    return { signal: 'none', confidence: 0, reason: 'données insuffisantes', metadata: {} };
  }

  const cur = rsi(closes, period);
  const prev = rsi(closes.slice(0, -1), period);
  const meta = { rsi: Number(cur.toFixed(2)), prev: Number(prev.toFixed(2)) };

  // Crossing back over the threshold
  if (prev < oversold && cur >= oversold) {
    return { signal: 'long', confidence: 0.80, reason: `RSI sort de la zone survendue (${meta.rsi})`, metadata: meta };
  }
  if (prev > overbought && cur <= overbought) {
    return { signal: 'short', confidence: 0.80, reason: `RSI sort de la zone surachetée (${meta.rsi})`, metadata: meta };
  }
  // Still inside extreme zone
  if (cur < oversold) {
    return { signal: 'long', confidence: 0.50, reason: `RSI survendu (${meta.rsi})`, metadata: meta };
  }
  if (cur > overbought) {
    return { signal: 'short', confidence: 0.50, reason: `RSI suracheté (${meta.rsi})`, metadata: meta };
  }
  return { signal: 'none', confidence: 0, reason: `RSI neutre (${meta.rsi})`, metadata: meta };
}
