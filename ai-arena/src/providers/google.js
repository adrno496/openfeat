import { fetchWithTimeout } from './index.js';

export async function callGoogle({ key, model }, messages, systemPrompt, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: opts.maxTokens || 300,
      temperature: opts.temperature ?? 0.8
    }
  };
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${res.status} ${errText}`);
  }
  const data = await res.json();
  const text =
    (data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text).join('')) || '';
  const u = data.usageMetadata || {};
  return {
    text,
    error: null,
    usage: { input: u.promptTokenCount || 0, output: u.candidatesTokenCount || 0 }
  };
}
