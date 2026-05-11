// Prix en USD pour 1M tokens (input / output). Source : tarifs publics des providers.
// Mise à jour : 2026-05. Vérifie la doc officielle pour les chiffres exacts.

export const PRICING = {
  anthropic: {
    'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-5-20251015': { input: 3.0, output: 15.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-opus-4-6': { input: 15.0, output: 75.0 }
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.0 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'o1-mini': { input: 3.0, output: 12.0 }
  },
  google: {
    'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
    'gemini-1.5-pro-latest': { input: 1.25, output: 5.0 },
    'gemini-2.0-flash-exp': { input: 0, output: 0 }
  },
  mistral: {
    'mistral-small-latest': { input: 0.20, output: 0.60 },
    'open-mistral-7b': { input: 0.25, output: 0.25 },
    'mistral-medium': { input: 2.7, output: 8.1 },
    'mistral-large-latest': { input: 2.0, output: 6.0 }
  },
  // Free / rate-limited for personal use
  cerebras: 'free',
  github: 'free',
  huggingface: 'free'
};

// OpenRouter prix : récupérés dynamiquement depuis l'API
export const _orPricing = {};

export function setOpenRouterPricing(modelId, inputPerToken, outputPerToken) {
  // OpenRouter retourne $/token, on stocke en $/M tokens
  _orPricing[modelId] = {
    input: (parseFloat(inputPerToken) || 0) * 1_000_000,
    output: (parseFloat(outputPerToken) || 0) * 1_000_000
  };
}

export function getModelPricing(providerId, modelId) {
  if (providerId === 'openrouter') {
    return _orPricing[modelId] || null;
  }
  const table = PRICING[providerId];
  if (!table) return null;
  if (table === 'free') return { input: 0, output: 0 };
  return table[modelId] || null;
}

export function estimateCost(providerId, modelId, inputTokens, outputTokens) {
  const p = getModelPricing(providerId, modelId);
  if (!p) return null;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function formatCost(usd) {
  if (usd == null) return '?';
  if (usd === 0) return '$0';
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 0.01) return '$' + usd.toFixed(4);
  if (usd < 1) return '$' + usd.toFixed(3);
  return '$' + usd.toFixed(2);
}
