import { callOpenAICompat } from './_openaiCompat.js';
export const callGitHub = (cfg, msgs, sys, opts) =>
  callOpenAICompat('https://models.inference.ai.azure.com/chat/completions', cfg, msgs, sys, opts);
