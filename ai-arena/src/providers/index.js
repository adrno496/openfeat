import { callAnthropic } from './anthropic.js';
import { callOpenAI } from './openai.js';
import { callOpenRouter } from './openrouter.js';
import { callGoogle } from './google.js';
import { callMistral } from './mistral.js';
import { callCerebras } from './cerebras.js';
import { callGitHub } from './github.js';
import { callHuggingFace } from './huggingface.js';

export const PROVIDERS = {
  anthropic: {
    label: 'Anthropic',
    call: callAnthropic,
    docsUrl: 'https://console.anthropic.com/',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', cost: 'cheap' },
      { id: 'claude-sonnet-4-5-20251015', label: 'Claude Sonnet 4.5', cost: 'mid' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', cost: 'mid' },
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', cost: 'pricey' }
    ]
  },
  openai: {
    label: 'OpenAI',
    call: callOpenAI,
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 'cheap' },
      { id: 'gpt-4o', label: 'GPT-4o', cost: 'mid' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: 'pricey' },
      { id: 'o1-mini', label: 'o1 Mini', cost: 'mid' }
    ]
  },
  openrouter: {
    label: 'OpenRouter',
    call: callOpenRouter,
    docsUrl: 'https://openrouter.ai/keys',
    dynamic: true,
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)', cost: 'cheap' }
    ]
  },
  google: {
    label: 'Google Gemini',
    call: callGoogle,
    docsUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', cost: 'cheap' },
      { id: 'gemini-1.5-flash-8b', label: 'Gemini Flash 8B', cost: 'cheap' },
      { id: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', cost: 'mid' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', cost: 'mid' }
    ]
  },
  mistral: {
    label: 'Mistral AI',
    call: callMistral,
    docsUrl: 'https://console.mistral.ai/api-keys/',
    models: [
      { id: 'mistral-small-latest', label: 'Mistral Small', cost: 'cheap' },
      { id: 'open-mistral-7b', label: 'Mistral 7B Open', cost: 'cheap' },
      { id: 'mistral-medium', label: 'Mistral Medium', cost: 'mid' },
      { id: 'mistral-large-latest', label: 'Mistral Large', cost: 'pricey' }
    ]
  },
  cerebras: {
    label: 'Cerebras',
    call: callCerebras,
    docsUrl: 'https://cloud.cerebras.ai/',
    models: [
      { id: 'llama3.1-8b', label: 'Llama 3.1 8B (rapide)', cost: 'cheap' },
      { id: 'llama3.3-70b', label: 'Llama 3.3 70B (rapide)', cost: 'mid' }
    ]
  },
  github: {
    label: 'GitHub Models',
    call: callGitHub,
    docsUrl: 'https://github.com/settings/tokens',
    models: [
      { id: 'Phi-3.5-mini-instruct', label: 'Phi 3.5 Mini', cost: 'cheap' },
      { id: 'Phi-3-medium-128k-instruct', label: 'Phi 3 Medium', cost: 'cheap' },
      { id: 'Mistral-small', label: 'Mistral Small', cost: 'cheap' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 'cheap' }
    ]
  },
  huggingface: {
    label: 'Hugging Face',
    call: callHuggingFace,
    docsUrl: 'https://huggingface.co/settings/tokens',
    models: [
      { id: 'microsoft/Phi-3.5-mini-instruct', label: 'Phi 3.5 Mini', cost: 'cheap' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B', cost: 'cheap' },
      { id: 'HuggingFaceH4/zephyr-7b-beta', label: 'Zephyr 7B', cost: 'cheap' }
    ]
  }
};

import { setOpenRouterPricing } from './pricing.js';

function classifyCost(promptPrice) {
  // promptPrice in $ per token (string from API)
  const p = parseFloat(promptPrice) || 0;
  // per-million tokens
  const perM = p * 1_000_000;
  if (perM < 0.5) return 'cheap';
  if (perM < 5) return 'mid';
  return 'pricey';
}

let _orModelsCache = null;
let _orModelsPromise = null;

export async function loadOpenRouterModels(force = false) {
  if (_orModelsCache && !force) return _orModelsCache;
  if (_orModelsPromise && !force) return _orModelsPromise;
  _orModelsPromise = (async () => {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const list = (data.data || []).map((m) => {
        if (m.pricing) {
          setOpenRouterPricing(m.id, m.pricing.prompt, m.pricing.completion);
        }
        return {
          id: m.id,
          label: m.name || m.id,
          cost: classifyCost(m.pricing && m.pricing.prompt)
        };
      });
      // Sort: free first, then cheap → pricey, alpha within tier
      const tierOrder = { cheap: 0, mid: 1, pricey: 2 };
      list.sort((a, b) => {
        const aFree = a.id.endsWith(':free') ? 0 : 1;
        const bFree = b.id.endsWith(':free') ? 0 : 1;
        if (aFree !== bFree) return aFree - bFree;
        if (tierOrder[a.cost] !== tierOrder[b.cost]) return tierOrder[a.cost] - tierOrder[b.cost];
        return a.label.localeCompare(b.label);
      });
      _orModelsCache = list;
      PROVIDERS.openrouter.models = list;
      return list;
    } catch {
      return PROVIDERS.openrouter.models;
    } finally {
      _orModelsPromise = null;
    }
  })();
  return _orModelsPromise;
}

export function getModel(providerId, modelId) {
  const p = PROVIDERS[providerId];
  if (!p) return null;
  return p.models.find((m) => m.id === modelId) || null;
}

export async function callProvider(providerId, config, messages, systemPrompt, opts = {}) {
  const p = PROVIDERS[providerId];
  if (!p) return { text: '', error: 'Provider inconnu' };
  // Sanitize key: trim whitespace AND strip wrapping quotes (common paste mistake)
  const cleanKey = String(config.key || '').trim().replace(/^["'`]|["'`]$/g, '');
  const cleanCfg = { ...config, key: cleanKey };
  try {
    return await p.call(cleanCfg, messages, systemPrompt, opts);
  } catch (err) {
    console.error(`[${providerId}] API error:`, err);
    return { text: '', error: humanizeError(err, providerId) };
  }
}

function extractApiMessage(body) {
  if (!body) return '';
  // Try parse JSON
  try {
    const j = JSON.parse(body);
    return (j.error && (j.error.message || j.error.code || j.error.type))
      || j.message || j.detail || JSON.stringify(j).slice(0, 200);
  } catch {
    return String(body).slice(0, 200);
  }
}

export function humanizeError(err, providerId = '') {
  if (!err) return 'Erreur inconnue';
  const msg = (err && err.message) || String(err);

  if (/AbortError|timeout/i.test(msg)) return 'Délai dépassé (30s)';
  if (/Failed to fetch|NetworkError|ERR_NETWORK/i.test(msg)) {
    return `Erreur réseau / CORS — ouvre la console pour plus de détails (${providerId})`;
  }

  // Our adapters throw `${status} ${body}` — extract them
  const m = msg.match(/^(\d{3})\s+([\s\S]*)$/);
  if (m) {
    const status = parseInt(m[1], 10);
    const apiMsg = extractApiMessage(m[2]) || '(pas de détail)';
    if (status === 401) return `401 — Clé refusée : ${apiMsg}`;
    if (status === 403) return `403 — Accès refusé (scope/permission manquante) : ${apiMsg}`;
    if (status === 404) return `404 — Modèle introuvable : ${apiMsg}`;
    if (status === 429) return `429 — Quota / rate limit : ${apiMsg}`;
    if (status === 400) return `400 — Requête invalide : ${apiMsg}`;
    return `${status} — ${apiMsg}`;
  }

  return msg.slice(0, 200);
}

export async function fetchWithTimeout(url, options, timeout = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}
