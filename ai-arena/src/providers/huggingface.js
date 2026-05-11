import { fetchWithTimeout } from './index.js';

export async function callHuggingFace({ key, model }, messages, systemPrompt, opts = {}) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}/v1/chat/completions`;
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ],
    max_tokens: opts.maxTokens || 300,
    temperature: opts.temperature ?? 0.8
  };
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${res.status} ${errText}`);
  }
  const data = await res.json();
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const u = data.usage || {};
  return {
    text,
    error: null,
    usage: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 }
  };
}
