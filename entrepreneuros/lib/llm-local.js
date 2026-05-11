// lib/llm-local.js — Mode 3 : Ollama HTTP local
const http = require('http');

function postJson(url, body, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const data = Buffer.from(JSON.stringify(body));
      const req = http.request({
        method: 'POST',
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname,
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
      }, (res) => {
        let chunks = '';
        res.on('data', (c) => { chunks += c.toString(); });
        res.on('end', () => {
          try { resolve(JSON.parse(chunks)); }
          catch (e) { reject(new Error('Réponse Ollama invalide : ' + chunks.slice(0, 200))); }
        });
      });
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout Ollama')));
      req.write(data);
      req.end();
    } catch (e) { reject(e); }
  });
}

function getJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const req = http.request({
        method: 'GET',
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname
      }, (res) => {
        let chunks = '';
        res.on('data', (c) => { chunks += c.toString(); });
        res.on('end', () => {
          try { resolve(JSON.parse(chunks)); }
          catch (e) { reject(new Error('Réponse non-JSON')); }
        });
      });
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout')));
      req.end();
    } catch (e) { reject(e); }
  });
}

async function generate(systemPrompt, userPrompt, options = {}) {
  const baseUrl = options.localUrl || 'http://localhost:11434';
  const model = options.localModel || options.model || 'llama3';
  const prompt = systemPrompt
    ? `<<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${userPrompt}`
    : userPrompt;

  const r = await postJson(`${baseUrl}/api/generate`, {
    model,
    prompt,
    stream: false,
    options: { temperature: options.temperature ?? 0.7 }
  }, options.timeoutMs || 180000);

  const txt = (r && r.response || '').trim();
  if (!txt) throw new Error('Ollama : réponse vide');
  return txt;
}

async function testConnection(cfg) {
  const baseUrl = cfg.localUrl || 'http://localhost:11434';
  try {
    const r = await getJson(`${baseUrl}/api/tags`, 3000);
    const models = (r.models || []).map((m) => m.name);
    if (!models.length) {
      return { ok: false, error: 'Ollama actif mais aucun modèle installé.', install: 'Lancez `ollama pull llama3`' };
    }
    return { ok: true, models, note: `${models.length} modèle(s) disponible(s)` };
  } catch (e) {
    return {
      ok: false,
      error: 'Ollama injoignable sur ' + baseUrl,
      install: 'Installez via https://ollama.com puis lancez `ollama serve`'
    };
  }
}

module.exports = { generate, testConnection };
