// Sentiment — port of bot.py:268-279.
// Contrarian: extreme fear → long, extreme greed → short.
// Reads the bot's cached fear-and-greed value rather than fetching here.

export async function sentimentStrategy(params, fearGreed) {
  const longBelow = params.longBelow ?? 35;
  const shortAbove = params.shortAbove ?? 75;
  const fg = fearGreed?.value ?? 50;
  const label = fearGreed?.label ?? 'Neutral';
  const meta = { value: fg, label };

  if (fg < longBelow) {
    // Confidence scales with how far below the threshold
    const confidence = Math.min(0.80, 0.40 + ((longBelow - fg) / longBelow) * 0.40);
    return { signal: 'long', confidence: Number(confidence.toFixed(2)),
             reason: `Fear & Greed ${fg} (${label}) — contrarien long`, metadata: meta };
  }
  if (fg > shortAbove) {
    const confidence = Math.min(0.80, 0.40 + ((fg - shortAbove) / (100 - shortAbove)) * 0.40);
    return { signal: 'short', confidence: Number(confidence.toFixed(2)),
             reason: `Fear & Greed ${fg} (${label}) — contrarien short`, metadata: meta };
  }
  return { signal: 'none', confidence: 0, reason: `sentiment neutre (${fg})`, metadata: meta };
}
