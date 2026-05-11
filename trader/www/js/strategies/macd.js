// MACD — port of bot.py:223-241
import { macd } from './indicators.js';

export async function macdStrategy(closes, params) {
  const fast = params.fast ?? 12;
  const slow = params.slow ?? 26;
  const sig = params.signal ?? 9;
  if (closes.length < slow + sig + 2) {
    return { signal: 'none', confidence: 0, reason: 'données insuffisantes', metadata: {} };
  }
  const m = macd(closes, fast, slow, sig);
  const meta = {
    macd: Number(m.macd.toFixed(4)),
    signal: Number(m.signal.toFixed(4)),
    histogram: Number(m.histogram.toFixed(4)),
  };

  const h = m.histogram;
  const ph = m.prevHistogram;

  // Histogram zero-cross
  if (ph <= 0 && h > 0) {
    return { signal: 'long', confidence: 0.80, reason: 'MACD croise au-dessus du signal', metadata: meta };
  }
  if (ph >= 0 && h < 0) {
    return { signal: 'short', confidence: 0.80, reason: 'MACD croise sous le signal', metadata: meta };
  }
  // Momentum continuation
  if (h > 0 && h > ph) {
    return { signal: 'long', confidence: 0.45, reason: 'MACD positif et croissant', metadata: meta };
  }
  if (h < 0 && h < ph) {
    return { signal: 'short', confidence: 0.45, reason: 'MACD négatif et décroissant', metadata: meta };
  }
  return { signal: 'none', confidence: 0, reason: 'momentum neutre', metadata: meta };
}
