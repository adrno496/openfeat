// Pure indicator math. No state, no IO.

export function ema(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  // Seed with SMA of the first `period` values, then iterate.
  let prev = 0;
  for (let i = 0; i < period; i++) prev += prices[i];
  prev /= period;
  const out = [prev];
  for (let i = period; i < prices.length; i++) {
    prev = prices[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function sma(prices, period) {
  const out = [];
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    out.push(sum / period);
  }
  return out;
}

export function rsi(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(prices, fast = 12, slow = 26, signalP = 9) {
  const def = { macd: 0, signal: 0, histogram: 0, prevHistogram: 0 };
  if (prices.length < slow + signalP) return def;
  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const len = Math.min(emaFast.length, emaSlow.length);
  const macdLine = [];
  for (let i = 0; i < len; i++) {
    macdLine.push(emaFast[emaFast.length - len + i] - emaSlow[emaSlow.length - len + i]);
  }
  const signalLine = ema(macdLine, signalP);
  if (signalLine.length < 2) return def;
  const macdV = macdLine.at(-1);
  const sigV = signalLine.at(-1);
  const prevSigV = signalLine.at(-2);
  const prevMacdV = macdLine.at(-1 - 1) ?? macdV;
  return {
    macd: macdV,
    signal: sigV,
    histogram: macdV - sigV,
    prevHistogram: prevMacdV - prevSigV,
  };
}

export function bollinger(prices, period = 20, stdDev = 2.0) {
  if (prices.length < period) {
    const p = prices.at(-1) ?? 0;
    return { upper: p, mid: p, lower: p, width: 0 };
  }
  const recent = prices.slice(-period);
  const mid = recent.reduce((a, b) => a + b, 0) / period;
  // Sample standard deviation (n-1) — matches TradingView and most quant tooling.
  const variance = recent.reduce((s, p) => s + (p - mid) ** 2, 0) / (period - 1);
  const std = Math.sqrt(variance);
  const upper = mid + stdDev * std;
  const lower = mid - stdDev * std;
  return { upper, mid, lower, width: mid > 0 ? (upper - lower) / mid : 0 };
}

// Wilder ATR. Seeds with the SMA of the first `period` true ranges, then
// applies Wilder smoothing: ATR[t] = (ATR[t-1] * (n-1) + TR[t]) / n.
export function atr(candles, period = 14) {
  if (candles.length < period + 1) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = parseFloat(candles[i].h);
    const l = parseFloat(candles[i].l);
    const pc = parseFloat(candles[i - 1].c);
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length;
  let atrV = 0;
  for (let i = 0; i < period; i++) atrV += trs[i];
  atrV /= period;
  for (let i = period; i < trs.length; i++) {
    atrV = (atrV * (period - 1) + trs[i]) / period;
  }
  return atrV;
}

// Session VWAP: resets at UTC midnight. Returns the VWAP for the most recent
// session present in the candles array. Falls back to the latest close if
// volume is missing or the session has zero volume.
export function vwap(candles) {
  if (!candles.length) return 0;
  // Find the start of the latest UTC day in the candles array.
  const lastTs = Number(candles.at(-1).t ?? candles.at(-1).T ?? Date.now());
  const dayMs = 24 * 60 * 60 * 1000;
  const dayStart = Math.floor(lastTs / dayMs) * dayMs;
  let cumPV = 0, cumVol = 0;
  for (const c of candles) {
    const ts = Number(c.t ?? c.T ?? 0);
    if (ts < dayStart) continue;
    const typical = (parseFloat(c.h) + parseFloat(c.l) + parseFloat(c.c)) / 3;
    const vol = parseFloat(c.v ?? 0);
    if (!Number.isFinite(vol) || vol <= 0) continue;
    cumPV += typical * vol;
    cumVol += vol;
  }
  if (cumVol > 0) return cumPV / cumVol;
  // No session volume — fall back to the cumulative VWAP of all candles.
  cumPV = 0; cumVol = 0;
  for (const c of candles) {
    const typical = (parseFloat(c.h) + parseFloat(c.l) + parseFloat(c.c)) / 3;
    const vol = parseFloat(c.v ?? 1);
    cumPV += typical * vol;
    cumVol += vol;
  }
  return cumVol > 0 ? cumPV / cumVol : parseFloat(candles.at(-1).c);
}
