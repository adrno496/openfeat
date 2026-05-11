import { callOpenAICompat } from './_openaiCompat.js';
export const callOpenRouter = (cfg, msgs, sys, opts) =>
  callOpenAICompat('https://openrouter.ai/api/v1/chat/completions', cfg, msgs, sys, opts, {
    'HTTP-Referer': location.origin,
    'X-Title': 'AI Arena'
  });
