const STORAGE_KEY = 'ai_arena_settings';

const DEFAULT_SETTINGS = {
  providers: {
    anthropic:   { enabled: false, key: '', defaultModel: 'claude-haiku-4-5-20251001' },
    openai:      { enabled: false, key: '', defaultModel: 'gpt-4o-mini' },
    openrouter:  { enabled: false, key: '', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free' },
    google:      { enabled: false, key: '', defaultModel: 'gemini-1.5-flash-latest' },
    mistral:     { enabled: false, key: '', defaultModel: 'mistral-small-latest' },
    cerebras:    { enabled: false, key: '', defaultModel: 'llama3.1-8b' },
    github:      { enabled: false, key: '', defaultModel: 'Phi-3.5-mini-instruct' },
    huggingface: { enabled: false, key: '', defaultModel: 'microsoft/Phi-3.5-mini-instruct' }
  },
  theme: 'dark',
  maxTokensPerTurn: 300,
  autoPlay: false
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      providers: { ...DEFAULT_SETTINGS.providers, ...(parsed.providers || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export const state = {
  settings: load(),
  game: null  // active game state
};

export function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

export function resetAllKeys() {
  for (const k of Object.keys(state.settings.providers)) {
    state.settings.providers[k].key = '';
    state.settings.providers[k].enabled = false;
  }
  saveSettings();
}

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
}

export function getEnabledProviders() {
  return Object.entries(state.settings.providers)
    .filter(([, p]) => p.enabled && p.key)
    .map(([id]) => id);
}
