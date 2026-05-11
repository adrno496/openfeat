import { callOpenAICompat } from './_openaiCompat.js';
export const callOpenAI = (cfg, msgs, sys, opts) =>
  callOpenAICompat('https://api.openai.com/v1/chat/completions', cfg, msgs, sys, opts);
