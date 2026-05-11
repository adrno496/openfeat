// ai-client.js — Multi-provider IA (Groq, OpenRouter, Anthropic, OpenAI, Mistral)
// Compteur de tokens et estimation de coût intégrés.

import { Storage } from './storage.js';
import { getDeviceId } from './device-id.js';

// TODO: remplacer après `wrangler deploy` par l'URL retournée (ex. https://worldstate-proxy.<account>.workers.dev)
export const FREEMIUM_PROXY_URL = 'http://localhost:8787';
export const FREEMIUM_DAILY_QUOTA = 100;

// --- CATALOGUE DES PROVIDERS ---
// Tarifs en $ par million de tokens (in/out). Mis à jour janvier 2026.
export const PROVIDERS = {
  freemium: {
    label: 'Gratuit',
    description: 'Aucune configuration — 100 messages/jour offerts',
    docsUrl: '',
    endpoint: '', // résolu dynamiquement via FREEMIUM_PROXY_URL
    apiStyle: 'openai',
    bundled: true,
    supportsStreaming: true,
    models: [
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', tier: 'cheap', priceIn: 0, priceOut: 0, fast: true, cheap: true, recommended: true },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', tier: 'premium', priceIn: 0, priceOut: 0, fast: true }
    ]
  },
  groq: {
    label: 'Groq',
    description: 'Ultra rapide, généreux gratuit',
    docsUrl: 'https://console.groq.com/keys',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiStyle: 'openai',
    supportsStreaming: true,
    models: [
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', tier: 'cheap', priceIn: 0.05, priceOut: 0.08, fast: true, cheap: true, recommended: true },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', tier: 'mid', priceIn: 0.24, priceOut: 0.24, fast: true },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', tier: 'premium', priceIn: 0.59, priceOut: 0.79, fast: true }
    ]
  },
  openrouter: {
    label: 'OpenRouter',
    description: 'Hub multi-modèles, options gratuites',
    docsUrl: 'https://openrouter.ai/keys',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiStyle: 'openai',
    supportsStreaming: true,
    models: [
      { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)', tier: 'cheap', priceIn: 0, priceOut: 0, free: true, fast: true, cheap: true, recommended: true },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', tier: 'mid', priceIn: 0.15, priceOut: 0.60, fast: true },
      { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', tier: 'premium', priceIn: 1.0, priceOut: 5.0, fast: true }
    ]
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude — qualité narrative supérieure',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiStyle: 'anthropic',
    supportsStreaming: true,
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', tier: 'cheap', priceIn: 1.0, priceOut: 5.0, fast: true, recommended: true },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'mid', priceIn: 3.0, priceOut: 15.0, fast: true },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', tier: 'premium', priceIn: 15.0, priceOut: 75.0, fast: false }
    ]
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT-4o et variantes',
    docsUrl: 'https://platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiStyle: 'openai',
    supportsStreaming: true,
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', tier: 'cheap', priceIn: 0.15, priceOut: 0.60, fast: true, cheap: true, recommended: true },
      { id: 'gpt-4o', label: 'GPT-4o', tier: 'mid', priceIn: 2.50, priceOut: 10.00, fast: true },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', tier: 'premium', priceIn: 10.0, priceOut: 30.0, fast: true }
    ]
  },
  mistral: {
    label: 'Mistral',
    description: 'Modèles européens',
    docsUrl: 'https://console.mistral.ai/api-keys',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    apiStyle: 'openai',
    supportsStreaming: true,
    models: [
      { id: 'mistral-small-latest', label: 'Mistral Small', tier: 'cheap', priceIn: 0.20, priceOut: 0.60, fast: true, cheap: true, recommended: true },
      { id: 'mistral-medium-latest', label: 'Mistral Medium', tier: 'mid', priceIn: 0.40, priceOut: 2.00, fast: true },
      { id: 'mistral-large-latest', label: 'Mistral Large', tier: 'premium', priceIn: 2.00, priceOut: 6.00, fast: true }
    ]
  }
};

export const TIER_LABELS = {
  cheap: '💰 Économique',
  mid: '⚖ Équilibré',
  premium: '👑 Premium'
};

export function getProviderInfo(providerId) {
  return PROVIDERS[providerId] || null;
}

export function getModelInfo(providerId, modelId) {
  const p = getProviderInfo(providerId);
  if (!p) return null;
  return p.models.find((m) => m.id === modelId) || p.models[0] || null;
}

export function estimateCost(providerId, modelId, tokensIn, tokensOut) {
  const m = getModelInfo(providerId, modelId);
  if (!m) return 0;
  const costIn = (tokensIn / 1_000_000) * (m.priceIn || 0);
  const costOut = (tokensOut / 1_000_000) * (m.priceOut || 0);
  return costIn + costOut;
}

// Heuristique tokens par message (~ 1 token pour 4 caractères en français)
export function estimateTokens(text) {
  if (typeof text !== 'string') return 0;
  return Math.ceil(text.length / 3.5);
}

// --- ABORT / TIMEOUT ---
// Registre des requêtes en vol. Permet de tout annuler lors d'un changement de panel
// ou d'un abandon de partie pour éviter les races et les écritures sur état détruit.
const _inFlight = new Set();
const DEFAULT_TIMEOUT_MS = 30_000;

function makeController(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  if (!ctrl) return { signal: undefined, cleanup: () => {} };
  _inFlight.add(ctrl);
  const timer = setTimeout(() => {
    try { ctrl.abort(new Error('Timeout API (>30s)')); } catch {}
  }, timeoutMs);
  return {
    signal: ctrl.signal,
    cleanup: () => {
      clearTimeout(timer);
      _inFlight.delete(ctrl);
    }
  };
}

export function cancelAllInFlight(reason = 'navigation') {
  for (const ctrl of _inFlight) {
    try { ctrl.abort(new Error(`Annulé : ${reason}`)); } catch {}
  }
  _inFlight.clear();
}

function isAbortError(err) {
  return err?.name === 'AbortError' || /aborted|abort/i.test(String(err?.message || ''));
}

// === PHASE 8.1 — CLASSIFICATION DES ERREURS IA ===
// Convertit une erreur brute (HTTP 4xx, network, JSON, etc.) en code stable +
// message utilisateur clair, et action recommandée.
export const AI_ERROR_TYPES = {
  INVALID_KEY:     { code: 'INVALID_KEY',     userMsg: 'Clé API invalide ou expirée.',                action: 'Vérifie la clé dans Paramètres.' },
  RATE_LIMIT:      { code: 'RATE_LIMIT',      userMsg: 'Limite de requêtes atteinte.',                action: 'Patiente quelques minutes.' },
  QUOTA_EXCEEDED:  { code: 'QUOTA_EXCEEDED',  userMsg: 'Quota API épuisé.',                            action: 'Recharge ton compte ou change de provider.' },
  NETWORK_ERROR:   { code: 'NETWORK_ERROR',   userMsg: 'Pas de connexion internet.',                   action: 'Le mode démo prend le relais.' },
  TIMEOUT:         { code: 'TIMEOUT',         userMsg: 'Délai dépassé (>30s).',                        action: 'Le serveur du provider est lent. Réessaye.' },
  MALFORMED_JSON:  { code: 'MALFORMED_JSON',  userMsg: 'L\'IA a renvoyé une réponse invalide.',        action: 'Réessaye, ou change de modèle.' },
  CONTENT_POLICY:  { code: 'CONTENT_POLICY',  userMsg: 'Contenu refusé par le provider.',              action: 'Reformule ta décision.' },
  ABORTED:         { code: 'ABORTED',         userMsg: 'Requête annulée.',                              action: '' },
  FREEMIUM_QUOTA_EXCEEDED: { code: 'FREEMIUM_QUOTA_EXCEEDED', userMsg: 'Quota gratuit atteint pour aujourd\'hui.', action: 'Réessaye demain ou ajoute ta propre clé API dans Paramètres.' },
  UNKNOWN:         { code: 'UNKNOWN',         userMsg: 'Erreur inconnue.',                              action: 'Réessaye plus tard.' }
};

// Vrai si l'utilisateur peut appeler l'IA : provider bundled (pas de clé) OU clé BYOK fournie.
export function hasAI(settings) {
  if (!settings) return false;
  const p = PROVIDERS[settings.provider];
  if (!p) return false;
  if (p.bundled) return true;
  return !!(settings.apiKey && String(settings.apiKey).trim());
}

// Construit les headers selon le provider. Exporté pour les tests.
export function buildHeaders(providerId, apiKey, deviceId) {
  const p = PROVIDERS[providerId];
  if (!p) return { 'Content-Type': 'application/json' };
  if (p.bundled) {
    return {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId || ''
    };
  }
  if (p.apiStyle === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if ((p.endpoint || '').includes('openrouter.ai')) {
    h['HTTP-Referer'] = 'https://app.smartlife.regne';
    h['X-Title'] = 'Regne';
  }
  return h;
}

function resolveEndpoint(provider) {
  if (provider.bundled) return FREEMIUM_PROXY_URL;
  return provider.endpoint;
}

// Tente d'extraire un code d'erreur structuré (notamment `quota_exceeded` du Worker freemium).
async function readErrorBody(res) {
  const txt = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(txt); } catch {}
  return { text: txt, json: parsed };
}

export function classifyAIError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (isAbortError(err) || /annulé|aborted/.test(msg)) return AI_ERROR_TYPES.ABORTED;
  if (/timeout|>30s/.test(msg)) return AI_ERROR_TYPES.TIMEOUT;
  if (/network|fetch failed|networkerror|failed to fetch/.test(msg)) return AI_ERROR_TYPES.NETWORK_ERROR;
  if (/401|403|invalid.*key|unauthorized|incorrect api key/.test(msg)) return AI_ERROR_TYPES.INVALID_KEY;
  if (/429|rate.?limit|too many requests/.test(msg)) return AI_ERROR_TYPES.RATE_LIMIT;
  if (/quota|insufficient|billing|payment required|402/.test(msg)) return AI_ERROR_TYPES.QUOTA_EXCEEDED;
  if (/content.?policy|safety|refused|moderation/.test(msg)) return AI_ERROR_TYPES.CONTENT_POLICY;
  if (/json|parse|unexpected token/.test(msg)) return AI_ERROR_TYPES.MALFORMED_JSON;
  return AI_ERROR_TYPES.UNKNOWN;
}

// --- APPEL IA UNIFIÉ ---
// messages : [{ role, content }]
// opts : { systemPrompt, maxTokens, temperature, json }
export async function callAI(messages, opts = {}) {
  const settings = Storage.getSettings();
  const provider = PROVIDERS[settings.provider];
  if (!provider) throw new Error(`Provider inconnu : ${settings.provider}`);
  if (!provider.bundled && !settings.apiKey) throw new Error('Aucune clé API configurée. Va dans Paramètres.');
  if (provider.bundled && !FREEMIUM_PROXY_URL) throw new Error('Mode gratuit pas encore configuré (FREEMIUM_PROXY_URL vide). Voir worker/README.md.');

  const model = settings.model || provider.models[0]?.id;
  const maxTokens = opts.maxTokens || 1200;
  const temperature = opts.temperature ?? 0.85;
  const systemPrompt = opts.systemPrompt || '';

  let response;
  let parsed;
  try {
    if (provider.apiStyle === 'anthropic') {
      response = await callAnthropic(provider, settings.apiKey, model, messages, systemPrompt, maxTokens, temperature);
      parsed = parseAnthropic(response);
    } else {
      response = await callOpenAICompat(provider, settings.apiKey, model, messages, systemPrompt, maxTokens, temperature);
      parsed = parseOpenAI(response);
    }
  } catch (err) {
    if (err && err.code === 'FREEMIUM_QUOTA_EXCEEDED') throw err;
    throw new Error(`Échec API (${provider.label}): ${err.message || err}`);
  }

  const cost = estimateCost(settings.provider, model, parsed.tokensIn, parsed.tokensOut);
  Storage.addTokensUsed(parsed.tokensIn, parsed.tokensOut, cost);

  return {
    content: parsed.content,
    tokensIn: parsed.tokensIn,
    tokensOut: parsed.tokensOut,
    cost,
    raw: response
  };
}

async function callOpenAICompat(provider, apiKey, model, messages, systemPrompt, maxTokens, temperature) {
  const fullMessages = [];
  if (systemPrompt) fullMessages.push({ role: 'system', content: systemPrompt });
  fullMessages.push(...messages);

  const providerId = Object.keys(PROVIDERS).find((k) => PROVIDERS[k] === provider) || '';
  const deviceId = provider.bundled ? getDeviceId() : null;
  const headers = buildHeaders(providerId, apiKey, deviceId);
  const endpoint = resolveEndpoint(provider);

  const body = {
    model,
    messages: fullMessages,
    max_tokens: maxTokens,
    temperature
  };

  const { signal, cleanup } = makeController();
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });
  } catch (err) {
    cleanup();
    if (isAbortError(err)) throw new Error('Requête IA annulée ou timeout dépassé');
    throw err;
  }

  if (!res.ok) {
    const { text, json: errJson } = await readErrorBody(res);
    cleanup();
    if (provider.bundled && res.status === 429 && errJson?.error?.code === 'quota_exceeded') {
      const e = new Error(`Quota gratuit atteint (${errJson.error.used}/${errJson.error.quota}). Réessaye après ${errJson.error.reset}.`);
      e.code = 'FREEMIUM_QUOTA_EXCEEDED';
      e.quota = errJson.error.quota;
      e.used = errJson.error.used;
      e.reset = errJson.error.reset;
      throw e;
    }
    throw new Error(`HTTP ${res.status}: ${truncateErr(text)}`);
  }
  try {
    return await res.json();
  } finally {
    cleanup();
  }
}

async function callAnthropic(provider, apiKey, model, messages, systemPrompt, maxTokens, temperature) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: messages.map((m) => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
  };
  if (systemPrompt) body.system = systemPrompt;

  const { signal, cleanup } = makeController();
  let res;
  try {
    res = await fetch(provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });
  } catch (err) {
    cleanup();
    if (isAbortError(err)) throw new Error('Requête IA annulée ou timeout dépassé');
    throw err;
  }
  if (!res.ok) {
    const err = await res.text();
    cleanup();
    throw new Error(`HTTP ${res.status}: ${truncateErr(err)}`);
  }
  try {
    return await res.json();
  } finally {
    cleanup();
  }
}

function parseOpenAI(response) {
  const content = response?.choices?.[0]?.message?.content || '';
  const usage = response?.usage || {};
  return {
    content: stripMarkdownFences(content),
    tokensIn: usage.prompt_tokens || estimateTokens(JSON.stringify(response?.request || '')),
    tokensOut: usage.completion_tokens || estimateTokens(content)
  };
}

function parseAnthropic(response) {
  const blocks = response?.content || [];
  const content = blocks.map((b) => (b?.type === 'text' ? b.text : '')).join('\n').trim();
  const usage = response?.usage || {};
  return {
    content: stripMarkdownFences(content),
    tokensIn: usage.input_tokens || 0,
    tokensOut: usage.output_tokens || estimateTokens(content)
  };
}

// --- APPEL IA EN STREAMING ---
// onChunk reçoit chaque morceau de texte au fur et à mesure (utile pour les conséquences/épitaphes)
// Renvoie le résultat final {content, tokensIn, tokensOut, cost}
export async function callAIStream(messages, opts = {}, onChunk = () => {}) {
  const settings = Storage.getSettings();
  const provider = PROVIDERS[settings.provider];
  if (!provider) throw new Error(`Provider inconnu : ${settings.provider}`);
  if (!provider.bundled && !settings.apiKey) throw new Error('Aucune clé API configurée. Va dans Paramètres.');
  if (provider.bundled && !FREEMIUM_PROXY_URL) throw new Error('Mode gratuit pas encore configuré (FREEMIUM_PROXY_URL vide). Voir worker/README.md.');

  const model = settings.model || provider.models[0]?.id;
  const maxTokens = opts.maxTokens || 1200;
  const temperature = opts.temperature ?? 0.85;
  const systemPrompt = opts.systemPrompt || '';

  const providerId = settings.provider;
  const deviceId = provider.bundled ? getDeviceId() : null;
  let url, headers, body;
  if (provider.apiStyle === 'anthropic') {
    url = resolveEndpoint(provider);
    headers = buildHeaders(providerId, settings.apiKey, deviceId);
    body = {
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      messages: messages.map((m) => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
    };
    if (systemPrompt) body.system = systemPrompt;
  } else {
    url = resolveEndpoint(provider);
    headers = buildHeaders(providerId, settings.apiKey, deviceId);
    const fullMessages = [];
    if (systemPrompt) fullMessages.push({ role: 'system', content: systemPrompt });
    fullMessages.push(...messages);
    body = {
      model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      stream_options: { include_usage: true }
    };
  }

  // Streaming : timeout plus long (60s) car la réponse peut s'étirer.
  const { signal, cleanup } = makeController(60_000);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  } catch (err) {
    cleanup();
    if (isAbortError(err)) throw new Error(`Annulé (${provider.label}) : navigation ou timeout`);
    throw new Error(`Échec API (${provider.label}): ${err.message || err}`);
  }

  if (!res.ok) {
    const { text: txt, json: errJson } = await readErrorBody(res);
    cleanup();
    if (provider.bundled && res.status === 429 && errJson?.error?.code === 'quota_exceeded') {
      const e = new Error(`Quota gratuit atteint (${errJson.error.used}/${errJson.error.quota}). Réessaye après ${errJson.error.reset}.`);
      e.code = 'FREEMIUM_QUOTA_EXCEEDED';
      e.quota = errJson.error.quota;
      e.used = errJson.error.used;
      e.reset = errJson.error.reset;
      throw e;
    }
    throw new Error(`HTTP ${res.status}: ${truncateErr(txt)}`);
  }

  if (!res.body || typeof res.body.getReader !== 'function') {
    // Fallback : pas de streaming dispo, on lit en bloc
    const text = await res.text();
    cleanup();
    const fakeFinal = parseStreamFallback(text, provider.apiStyle);
    onChunk(fakeFinal.content);
    const cost = estimateCost(settings.provider, model, fakeFinal.tokensIn, fakeFinal.tokensOut);
    Storage.addTokensUsed(fakeFinal.tokensIn, fakeFinal.tokensOut, cost);
    return { ...fakeFinal, cost };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  let tokensIn = 0;
  let tokensOut = 0;

  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (err) {
      cleanup();
      if (isAbortError(err)) throw new Error('Streaming IA annulé ou timeout dépassé');
      throw err;
    }
    const { value, done } = chunk;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Découpe par lignes SSE
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // garde la ligne incomplète

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) continue;
      if (!line.startsWith('data:')) continue;

      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;

      let json;
      try { json = JSON.parse(data); } catch { continue; }

      if (provider.apiStyle === 'anthropic') {
        // event: content_block_delta payload : {type, index, delta: {type, text}}
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          const delta = json.delta.text || '';
          fullText += delta;
          if (delta) onChunk(delta);
        } else if (json.type === 'message_start') {
          tokensIn = json.message?.usage?.input_tokens || 0;
          tokensOut = json.message?.usage?.output_tokens || 0;
        } else if (json.type === 'message_delta') {
          // L'usage final apparaît ici, et output_tokens est cumulatif
          if (json.usage?.output_tokens) tokensOut = json.usage.output_tokens;
          if (json.usage?.input_tokens) tokensIn = json.usage.input_tokens;
        }
        // message_stop : juste un signal de fin, rien à faire
      } else {
        // OpenAI-compat : choices[0].delta.content
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
        if (json.usage) {
          tokensIn = json.usage.prompt_tokens || tokensIn;
          tokensOut = json.usage.completion_tokens || tokensOut;
        }
      }
    }
  }

  const finalContent = stripMarkdownFences(fullText);
  if (!tokensOut) tokensOut = estimateTokens(finalContent);
  if (!tokensIn) tokensIn = estimateTokens(JSON.stringify(messages) + (systemPrompt || ''));

  cleanup();
  const cost = estimateCost(settings.provider, model, tokensIn, tokensOut);
  Storage.addTokensUsed(tokensIn, tokensOut, cost);

  return { content: finalContent, tokensIn, tokensOut, cost };
}

function parseStreamFallback(text, apiStyle) {
  // Si la réponse n'a pas streamée, essayer de parser en JSON normal
  try {
    const json = JSON.parse(text);
    if (apiStyle === 'anthropic') return parseAnthropic(json);
    return parseOpenAI(json);
  } catch {
    return { content: text, tokensIn: estimateTokens(text), tokensOut: estimateTokens(text) };
  }
}

// L'IA renvoie souvent ```json ... ``` même quand on demande du JSON brut
function stripMarkdownFences(text) {
  if (typeof text !== 'string') return '';
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json|JSON)?\s*/, '').replace(/```\s*$/, '');
  }
  return t.trim();
}

function truncateErr(s) {
  if (typeof s !== 'string') return '';
  return s.length > 400 ? s.slice(0, 400) + '…' : s;
}

// Teste la connexion avec une requête minimale
export async function testApiConnection() {
  const settings = Storage.getSettings();
  if (!hasAI(settings)) return { ok: false, error: 'Aucune clé API' };
  try {
    const r = await callAI(
      [{ role: 'user', content: 'Réponds juste "OK"' }],
      { systemPrompt: 'Tu es un système de test. Réponds en un seul mot.', maxTokens: 10, temperature: 0 }
    );
    return { ok: true, latencyMs: 0, content: r.content?.slice(0, 30), tokens: r.tokensIn + r.tokensOut };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

// Utilitaire pour parser du JSON tolérant (récupère le bloc JSON d'une réponse parfois bavarde)
export function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {}
  // Essaie d'extraire le premier { ... } de premier niveau
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {}
  }
  return null;
}
