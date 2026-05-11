import { callOpenAICompat } from './_openaiCompat.js';
export const callMistral = (cfg, msgs, sys, opts) =>
  callOpenAICompat('https://api.mistral.ai/v1/chat/completions', cfg, msgs, sys, opts);
