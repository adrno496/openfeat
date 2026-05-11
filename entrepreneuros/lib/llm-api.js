// lib/llm-api.js — Multi-provider via APIs natives + endpoints OpenAI-compatibles
// Providers supportés : anthropic (Claude), openai (GPT), gemini (Google),
//                       mistral (Mistral AI), deepseek, groq
const keys = require('./keys');
const usage = require('./usage');

const PROVIDERS = {
  anthropic: {
    label: 'Anthropic Claude',
    keyName: 'ANTHROPIC_API_KEY',
    keyHint: 'sk-ant-api03-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    native: true,
    models: {
      haiku:  'claude-haiku-4-5',
      sonnet: 'claude-sonnet-4-6',
      opus:   'claude-opus-4-7'
    },
    pricing: '~0.25 $ / million tokens (Haiku) → 15 $ (Opus)'
  },
  openai: {
    label: 'OpenAI GPT',
    keyName: 'OPENAI_API_KEY',
    keyHint: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    baseURL: null, // standard OpenAI
    models: {
      haiku:  'gpt-4o-mini',
      sonnet: 'gpt-4o',
      opus:   'gpt-4o'
    },
    pricing: '~0.15 $ / million tokens (mini) → 5 $ (4o)'
  },
  gemini: {
    label: 'Google Gemini',
    keyName: 'GEMINI_API_KEY',
    keyHint: 'AIza…',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: {
      haiku:  'gemini-2.0-flash',
      sonnet: 'gemini-2.5-flash',
      opus:   'gemini-2.5-pro'
    },
    pricing: 'Tier gratuit généreux + payant ~0.075 $ / 1M tokens (Flash)'
  },
  mistral: {
    label: 'Mistral AI',
    keyName: 'MISTRAL_API_KEY',
    keyHint: '…',
    keyUrl: 'https://console.mistral.ai/api-keys',
    baseURL: 'https://api.mistral.ai/v1',
    models: {
      haiku:  'ministral-8b-latest',
      sonnet: 'mistral-medium-latest',
      opus:   'mistral-large-latest'
    },
    pricing: '~0.10 $ / 1M tokens (8b) → 2 $ (Large) — provider français'
  },
  deepseek: {
    label: 'DeepSeek',
    keyName: 'DEEPSEEK_API_KEY',
    keyHint: 'sk-…',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    baseURL: 'https://api.deepseek.com',
    models: {
      haiku:  'deepseek-chat',
      sonnet: 'deepseek-chat',
      opus:   'deepseek-reasoner'
    },
    pricing: '~0.14 $ / 1M tokens (Chat) — le meilleur rapport qualité/prix'
  },
  groq: {
    label: 'Groq (inférence ultra-rapide)',
    keyName: 'GROQ_API_KEY',
    keyHint: 'gsk_…',
    keyUrl: 'https://console.groq.com/keys',
    baseURL: 'https://api.groq.com/openai/v1',
    models: {
      haiku:  'llama-3.1-8b-instant',
      sonnet: 'llama-3.3-70b-versatile',
      opus:   'llama-3.3-70b-versatile'
    },
    pricing: 'Très bon marché + vitesse extrême (500+ tokens/s)'
  }
};

async function generate(systemPrompt, userPrompt, options = {}) {
  const provider = options.apiProvider || 'anthropic';
  const tier = options.tier || options.modelTier || 'sonnet';
  if (provider === 'anthropic') return await generateAnthropic(systemPrompt, userPrompt, tier, options);
  return await generateOpenAICompat(provider, systemPrompt, userPrompt, tier, options);
}

function getAnthropicClient() {
  const apiKey = keys.requireKey('ANTHROPIC_API_KEY');
  const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
  return new Anthropic({ apiKey });
}

function getOpenAICompatClient(provider) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Provider inconnu : ${provider}`);
  const apiKey = keys.requireKey(cfg.keyName);
  const OpenAI = require('openai').default || require('openai');
  const opts = { apiKey };
  if (cfg.baseURL) opts.baseURL = cfg.baseURL;
  return new OpenAI(opts);
}

async function generateAnthropic(systemPrompt, userPrompt, tier, options) {
  const client = getAnthropicClient();
  const cfg = PROVIDERS.anthropic;
  const model = options.model || cfg.models[tier] || cfg.models.sonnet;
  const onChunk = options.onChunk;

  // Prompt caching activé sur le system prompt si > ~1500 chars
  const systemBlocks = systemPrompt && systemPrompt.length > 1500
    ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
    : systemPrompt;

  const params = {
    model,
    max_tokens: options.maxTokens || 4096,
    system: systemBlocks,
    messages: options.messages || [{ role: 'user', content: userPrompt }]
  };

  if (onChunk) {
    let txt = '';
    const stream = await client.messages.stream(params);
    stream.on('text', (delta) => { txt += delta; try { onChunk(delta, txt); } catch {} });
    const final = await stream.finalMessage();
    if (!txt.trim()) throw new Error('Réponse Anthropic vide');
    try {
      const u = final.usage || {};
      usage.record({
        provider: 'anthropic', model, module: options.module,
        inputTokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0),
        outputTokens: u.output_tokens || 0,
        cachedTokens: u.cache_read_input_tokens || 0
      });
    } catch {}
    return txt.trim();
  }

  const r = await client.messages.create(params);
  const txt = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!txt) throw new Error('Réponse Anthropic vide');
  try {
    const u = r.usage || {};
    usage.record({
      provider: 'anthropic', model, module: options.module,
      inputTokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0),
      outputTokens: u.output_tokens || 0,
      cachedTokens: u.cache_read_input_tokens || 0
    });
  } catch {}
  return txt;
}

async function generateOpenAICompat(provider, systemPrompt, userPrompt, tier, options) {
  const client = getOpenAICompatClient(provider);
  const cfg = PROVIDERS[provider];
  const model = options.model || cfg.models[tier] || cfg.models.sonnet;
  const onChunk = options.onChunk;

  const messages = options.messages
    ? (systemPrompt ? [{ role: 'system', content: systemPrompt }, ...options.messages] : options.messages)
    : [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ];

  const params = { model, messages, max_tokens: options.maxTokens || 4096 };

  if (onChunk) {
    let txt = '';
    let lastUsage = null;
    const stream = await client.chat.completions.create({ ...params, stream: true, stream_options: { include_usage: true } });
    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content || '';
      if (delta) { txt += delta; try { onChunk(delta, txt); } catch {} }
      if (part.usage) lastUsage = part.usage;
    }
    if (!txt.trim()) throw new Error(`Réponse ${cfg.label} vide`);
    if (lastUsage) {
      try {
        usage.record({
          provider, model, module: options.module,
          inputTokens: lastUsage.prompt_tokens || 0,
          outputTokens: lastUsage.completion_tokens || 0
        });
      } catch {}
    }
    return txt.trim();
  }

  const r = await client.chat.completions.create(params);
  const txt = r.choices?.[0]?.message?.content?.trim();
  if (!txt) throw new Error(`Réponse ${cfg.label} vide`);
  try {
    const u = r.usage || {};
    usage.record({
      provider, model, module: options.module,
      inputTokens: u.prompt_tokens || 0,
      outputTokens: u.completion_tokens || 0
    });
  } catch {}
  return txt;
}

async function testConnection(cfg) {
  const provider = cfg.apiProvider || 'anthropic';
  const pcfg = PROVIDERS[provider];
  if (!pcfg) return { ok: false, error: `Provider inconnu : ${provider}` };
  const v = keys.getKey(pcfg.keyName);
  if (!v) return { ok: false, error: `Clé ${pcfg.keyName} manquante` };
  try {
    const txt = await generate('Réponds en un mot : ok', 'ping', { apiProvider: provider, tier: 'haiku' });
    return { ok: true, note: txt.slice(0, 60) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { generate, testConnection, PROVIDERS };
