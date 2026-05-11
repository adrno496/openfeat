// worldstate-proxy — Cloudflare Worker
// Proxie les requêtes OpenAI-compatibles vers Groq, avec quota par appareil (KV).

const ALLOWED_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile'
]);

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_TOKENS_CAP = 2000;
const KV_TTL_SECONDS = 26 * 60 * 60; // 26h pour absorber les fuseaux autour de minuit UTC

const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
  'Access-Control-Max-Age': '86400'
};

function json(status, obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}

function errorResp(status, code, message, extra = {}) {
  return json(status, { error: { code, message, ...extra } });
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function nextResetIso() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
      return errorResp(404, 'not_found', 'Endpoint inconnu');
    }

    const deviceId = request.headers.get('X-Device-Id') || '';
    if (!DEVICE_ID_RE.test(deviceId)) {
      return errorResp(400, 'invalid_device_id', 'Header X-Device-Id manquant ou invalide (8-64 chars alphanum/-)');
    }

    const lenHeader = request.headers.get('Content-Length');
    if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
      return errorResp(413, 'body_too_large', `Body > ${MAX_BODY_BYTES} octets`);
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return errorResp(413, 'body_too_large', `Body > ${MAX_BODY_BYTES} octets`);
    }

    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return errorResp(400, 'invalid_json', 'Body JSON invalide');
    }

    if (!body || typeof body.model !== 'string' || !ALLOWED_MODELS.has(body.model)) {
      return errorResp(400, 'invalid_model', `Modèle non autorisé. Whitelist : ${[...ALLOWED_MODELS].join(', ')}`);
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return errorResp(400, 'invalid_messages', 'Champ "messages" doit être un tableau non vide');
    }

    if (typeof body.max_tokens === 'number' && body.max_tokens > MAX_TOKENS_CAP) {
      body.max_tokens = MAX_TOKENS_CAP;
    } else if (typeof body.max_tokens !== 'number') {
      body.max_tokens = MAX_TOKENS_CAP;
    }

    const quota = Number(env.DAILY_QUOTA || '100');
    const day = todayUtc();
    const kvKey = `q:${deviceId}:${day}`;

    const currentRaw = await env.QUOTA.get(kvKey);
    const used = currentRaw ? Number(currentRaw) || 0 : 0;

    if (used >= quota) {
      return errorResp(429, 'quota_exceeded', 'Quota gratuit quotidien atteint', {
        quota,
        used,
        reset: nextResetIso()
      });
    }

    const newUsed = used + 1;
    await env.QUOTA.put(kvKey, String(newUsed), { expirationTtl: KV_TTL_SECONDS });

    const remaining = Math.max(0, quota - newUsed);

    let groqResp;
    try {
      groqResp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      return errorResp(502, 'upstream_unreachable', `Groq indisponible : ${err?.message || err}`);
    }

    const respHeaders = new Headers(groqResp.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) respHeaders.set(k, v);
    respHeaders.set('X-Quota-Limit', String(quota));
    respHeaders.set('X-Quota-Remaining', String(remaining));
    respHeaders.delete('Content-Encoding');
    respHeaders.delete('Content-Length');

    return new Response(groqResp.body, {
      status: groqResp.status,
      headers: respHeaders
    });
  }
};
