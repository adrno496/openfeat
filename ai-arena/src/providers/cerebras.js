import { callOpenAICompat } from './_openaiCompat.js';
export const callCerebras = (cfg, msgs, sys, opts) =>
  callOpenAICompat('https://api.cerebras.ai/v1/chat/completions', cfg, msgs, sys, opts);
