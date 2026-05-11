// Consensus aggregator. Each enabled strategy contributes weighted confidence
// to a long_score / short_score. A direction is returned only if the NET
// score (winner − loser) clears `minConsensusScore` AND the count of agreeing
// strategies clears `minStrategiesAgreeing`.
//
// Scores are normalised by the sum of *enabled* weights, so the threshold is
// directly interpretable as "fraction of conviction" regardless of how many
// strategies the user has turned on.
import { emaCrossStrategy } from './ema_cross.js';
import { rsiStrategy } from './rsi.js';
import { macdStrategy } from './macd.js';
import { bollingerStrategy } from './bollinger.js';
import { vwapStrategy } from './vwap.js';
import { sentimentStrategy } from './sentiment.js';

export async function computeConsensus(candles, config, fearGreed) {
  const closes = candles.map((c) => parseFloat(c.c));
  const sc = config.strategies || {};
  const results = {};

  if (sc.emaCross?.enabled) {
    results.emaCross = { ...(await emaCrossStrategy(closes, sc.emaCross)), weight: sc.emaCross.weight };
  }
  if (sc.rsi?.enabled) {
    results.rsi = { ...(await rsiStrategy(closes, sc.rsi)), weight: sc.rsi.weight };
  }
  if (sc.macd?.enabled) {
    results.macd = { ...(await macdStrategy(closes, sc.macd)), weight: sc.macd.weight };
  }
  if (sc.bollinger?.enabled) {
    results.bollinger = { ...(await bollingerStrategy(closes, sc.bollinger)), weight: sc.bollinger.weight };
  }
  if (sc.vwap?.enabled) {
    results.vwap = { ...(await vwapStrategy(candles, sc.vwap)), weight: sc.vwap.weight };
  }
  if (sc.sentiment?.enabled) {
    results.sentiment = { ...(await sentimentStrategy(sc.sentiment, fearGreed)), weight: sc.sentiment.weight };
  }

  let longScore = 0, shortScore = 0, longCount = 0, shortCount = 0, totalWeight = 0;
  for (const r of Object.values(results)) {
    totalWeight += r.weight;
    if (r.signal === 'long') { longScore += r.confidence * r.weight; longCount++; }
    else if (r.signal === 'short') { shortScore += r.confidence * r.weight; shortCount++; }
  }

  // Normalise so the threshold means "fraction of total enabled conviction".
  const norm = totalWeight > 0 ? totalWeight : 1;
  const longNorm = longScore / norm;
  const shortNorm = shortScore / norm;
  // Net conviction: the directional edge after subtracting the opposing camp.
  const longNet = longNorm - shortNorm;
  const shortNet = shortNorm - longNorm;

  const minScore = config.minConsensusScore ?? 0.40;
  const minCount = config.minStrategiesAgreeing ?? 2;

  let direction = 'none';
  let score = 0;

  if (longNet >= minScore && longCount >= minCount) {
    direction = 'long';
    score = longNorm;
  } else if (shortNet >= minScore && shortCount >= minCount) {
    direction = 'short';
    score = shortNorm;
  }

  return {
    direction,
    score,
    longScore: longNorm,
    shortScore: shortNorm,
    longCount,
    shortCount,
    strategies: results,
  };
}
