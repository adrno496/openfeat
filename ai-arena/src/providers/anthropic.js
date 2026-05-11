import { fetchWithTimeout } from './index.js';

export async function callAnthropic({ key, model }, messages, systemPrompt, opts = {}) {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      max_tokens: opts.maxTokens || 300,
      temperature: opts.temperature ?? 0.8
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${res.status} ${errText}`);
  }
  const data = await res.json();
  const text = (data.content && data.content[0] && data.content[0].text) || '';
  const u = data.usage || {};
  return {
    text,
    error: null,
    usage: { input: u.input_tokens || 0, output: u.output_tokens || 0 }
  };
}
