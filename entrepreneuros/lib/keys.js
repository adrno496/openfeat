// lib/keys.js — Stockage chiffré AES-256-GCM des clés API
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const { dataFile } = require('./paths');
const KEYS_FILE = dataFile('keys.enc');
const ALGO = 'aes-256-gcm';

// Dérive une clé 32 bytes depuis un identifiant machine + sel fixe.
function deriveKey() {
  const seed = (os.hostname() || 'eos') + '|' + (os.userInfo().username || 'user') + '|eos-v2-static-salt';
  return crypto.createHash('sha256').update(seed).digest();
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const key = deriveKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payload) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const enc = buf.slice(28);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function ensureDir() {
  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadAll() {
  try {
    if (!fs.existsSync(KEYS_FILE)) return {};
    const raw = fs.readFileSync(KEYS_FILE, 'utf8').trim();
    if (!raw) return {};
    return JSON.parse(decrypt(raw));
  } catch (e) {
    console.error('[keys] Erreur de lecture :', e.message);
    return {};
  }
}

function saveAll(obj) {
  ensureDir();
  fs.writeFileSync(KEYS_FILE, encrypt(JSON.stringify(obj)), 'utf8');
}

function setKey(name, value) {
  const all = loadAll();
  all[name] = String(value || '');
  saveAll(all);
}

function getKey(name) {
  const all = loadAll();
  if (all[name]) return all[name];
  if (process.env[name]) return process.env[name];
  return null;
}

function requireKey(name) {
  const v = getKey(name);
  if (!v) throw new Error(`Clé "${name}" introuvable. Renseignez-la dans Settings ou .env`);
  return v;
}

function deleteKey(name) {
  const all = loadAll();
  delete all[name];
  saveAll(all);
}

function listKeys() {
  const known = [
    'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
    'GEMINI_API_KEY', 'MISTRAL_API_KEY', 'DEEPSEEK_API_KEY', 'GROQ_API_KEY',
    'RESEND_API_KEY', 'EMAIL_FROM', 'STRIPE_SECRET_KEY'
  ];
  const all = loadAll();
  return known.map((name) => {
    const v = all[name] || process.env[name] || '';
    return {
      name,
      preview: v ? '••••' + v.slice(-4) : '',
      hasValue: Boolean(v)
    };
  });
}

async function validateKey(name, value) {
  if (!value) return { valid: false, error: 'Clé vide' };
  try {
    if (name === 'ANTHROPIC_API_KEY') {
      const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: value });
      const r = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with: ok' }]
      });
      return { valid: Boolean(r && r.content), info: 'Anthropic OK' };
    }
    if (name === 'OPENAI_API_KEY') {
      const OpenAI = require('openai').default || require('openai');
      const client = new OpenAI({ apiKey: value });
      const r = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with: ok' }]
      });
      return { valid: Boolean(r && r.choices), info: 'OpenAI OK' };
    }
    // Providers OpenAI-compatibles : on teste via leur baseURL
    const OPENAI_COMPAT = {
      GEMINI_API_KEY:   { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash', label: 'Gemini' },
      MISTRAL_API_KEY:  { baseURL: 'https://api.mistral.ai/v1', model: 'ministral-8b-latest', label: 'Mistral' },
      DEEPSEEK_API_KEY: { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat', label: 'DeepSeek' },
      GROQ_API_KEY:     { baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant', label: 'Groq' }
    };
    if (OPENAI_COMPAT[name]) {
      const cfg = OPENAI_COMPAT[name];
      const OpenAI = require('openai').default || require('openai');
      const client = new OpenAI({ apiKey: value, baseURL: cfg.baseURL });
      const r = await client.chat.completions.create({
        model: cfg.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with: ok' }]
      });
      return { valid: Boolean(r && r.choices), info: `${cfg.label} OK` };
    }
    if (name === 'RESEND_API_KEY') {
      if (!/^re_[A-Za-z0-9_-]{10,}$/.test(value)) return { valid: false, error: 'Format Resend invalide' };
      return { valid: true, info: 'Format OK' };
    }
    if (name === 'EMAIL_FROM') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { valid: false, error: 'Email invalide' };
      return { valid: true, info: 'Email OK' };
    }
    if (name === 'STRIPE_SECRET_KEY') {
      if (!/^sk_(test|live)_/.test(value)) return { valid: false, error: 'Format Stripe invalide' };
      return { valid: true, info: 'Format OK' };
    }
    return { valid: true, info: 'Sauvegardé' };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = { setKey, getKey, requireKey, deleteKey, listKeys, validateKey };
