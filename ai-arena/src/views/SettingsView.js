import { state, saveSettings, resetAllKeys, applyTheme } from '../state.js';
import { PROVIDERS, callProvider, loadOpenRouterModels } from '../providers/index.js';
import { toast } from '../components/Toast.js';

function costBadge(cost) {
  if (cost === 'cheap') return '<span class="badge badge-cheap">💚 Économique</span>';
  if (cost === 'mid') return '<span class="badge badge-mid">💛 Équilibré</span>';
  return '<span class="badge badge-pricey">🔴 Premium</span>';
}

const PROVIDER_HINTS = {
  anthropic: 'Format attendu : <code>sk-ant-api03-...</code>. Le compte doit avoir du crédit.',
  openai: 'Format attendu : <code>sk-...</code> ou <code>sk-proj-...</code>. Le compte doit avoir du crédit (sinon → 429).',
  openrouter: 'Format attendu : <code>sk-or-v1-...</code>. Les modèles <code>:free</code> ont une limite quotidienne.',
  google: 'Crée la clé sur AI Studio (pas Cloud Console). Format alphanumérique court.',
  mistral: 'Format alphanumérique. Le compte doit être vérifié.',
  cerebras: 'Format <code>csk-...</code>.',
  github: '<strong>PAT GitHub</strong> avec scope <code>models:read</code> requis (pas un PAT classique). Crée-le en "Fine-grained token".',
  huggingface: 'Token <code>hf_...</code> avec permission <strong>"Make calls to the serverless Inference API"</strong> activée. Certains modèles nécessitent des crédits (Pro).'
};

export function SettingsView(root) {
  const sectionsHtml = Object.entries(PROVIDERS).map(([id, p]) => {
    const cfg = state.settings.providers[id];
    // Make sure the saved model still appears as an option even if not in current list
    const allModels = [...p.models];
    if (cfg.defaultModel && !allModels.find((m) => m.id === cfg.defaultModel)) {
      allModels.unshift({ id: cfg.defaultModel, label: cfg.defaultModel + ' (sauvegardé)', cost: 'cheap' });
    }
    const optsHtml = allModels.map((m) =>
      `<option value="${m.id}" ${cfg.defaultModel === m.id ? 'selected' : ''}>${m.label}${m.cost === 'cheap' ? ' 💚' : m.cost === 'mid' ? ' 💛' : ' 🔴'}</option>`
    ).join('');
    const currentModel = allModels.find((m) => m.id === cfg.defaultModel) || allModels[0];
    return `
      <div class="card provider-section" data-provider="${id}">
        <div class="provider-header">
          <div class="provider-name">
            <span class="provider-badge pb-${id}">${p.label}</span>
          </div>
          <label class="toggle">
            <input type="checkbox" data-field="enabled" ${cfg.enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="field">
          <label class="field-label">Clé API <a href="${p.docsUrl}" target="_blank" rel="noopener">(obtenir)</a></label>
          <div class="password-wrap">
            <input type="password" data-field="key" value="${escapeAttr(cfg.key)}" placeholder="sk-..." autocomplete="off" />
            <button class="eye-btn" data-action="toggleEye" title="Afficher">👁</button>
          </div>
          ${PROVIDER_HINTS[id] ? `<div class="provider-hint">💡 ${PROVIDER_HINTS[id]}</div>` : ''}
        </div>
        <div class="field">
          <label class="field-label">
            Modèle par défaut${p.dynamic ? ` <span class="text-muted" data-role="modelCount">(${allModels.length} dispo)</span>` : ''}
          </label>
          <div class="field-row">
            <select data-field="defaultModel">${optsHtml}</select>
            <span class="model-cost">${costBadge(currentModel ? currentModel.cost : 'cheap')}</span>
          </div>
        </div>
        <div class="flex-gap">
          <button class="btn btn-small" data-action="test">Tester la clé</button>
          ${p.dynamic ? '<button class="btn btn-small" data-action="refresh">🔄 Recharger la liste</button>' : ''}
          <span class="test-result"></span>
        </div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <h1>Réglages</h1>
    <p class="subtitle">Configure tes clés API. Elles restent dans ton navigateur — jamais transmises ailleurs.</p>

    <div class="warning">
      🔒 Tes clés sont stockées en local (localStorage). Ne partage pas cet appareil.
    </div>

    <div class="tip">
      <strong>💡 Économies :</strong> Llama 3.1 8B via OpenRouter et Mistral 7B via OpenRouter sont
      <strong>gratuits</strong>. Pour du chat de qualité au meilleur prix : <strong>Gemini 1.5 Flash</strong>,
      <strong>Claude Haiku</strong>, ou <strong>Llama 3.3 70B</strong> via OpenRouter. Le plus rapide :
      <strong>Cerebras Llama 3.1 8B</strong>.
    </div>

    <div class="card">
      <div class="card-title">🎨 Préférences</div>
      <div class="field">
        <label class="field-label">Thème</label>
        <select id="themeSelect">
          <option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Sombre</option>
          <option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Clair</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Tokens max par réponse (${state.settings.maxTokensPerTurn})</label>
        <input type="range" id="tokensRange" min="100" max="800" step="50" value="${state.settings.maxTokensPerTurn}" />
      </div>
      <div class="field flex-gap">
        <label class="toggle">
          <input type="checkbox" id="autoPlay" ${state.settings.autoPlay ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
        <span>Auto-play (les tours s'enchaînent automatiquement)</span>
      </div>
    </div>

    <h2 style="margin-top: 24px; margin-bottom: 12px;">🔌 Providers</h2>
    ${sectionsHtml}

    <div class="card" style="margin-top: 24px;">
      <button class="btn btn-danger btn-block" id="resetKeys">🗑 Effacer toutes les clés</button>
    </div>
  `;

  // Wire up
  root.querySelectorAll('.provider-section').forEach((section) => {
    const id = section.dataset.provider;

    section.querySelector('[data-field="enabled"]').onchange = (e) => {
      state.settings.providers[id].enabled = e.target.checked;
      saveSettings();
    };
    section.querySelector('[data-field="key"]').oninput = (e) => {
      state.settings.providers[id].key = e.target.value.trim();
      saveSettings();
    };
    section.querySelector('[data-field="defaultModel"]').onchange = (e) => {
      state.settings.providers[id].defaultModel = e.target.value;
      const m = PROVIDERS[id].models.find((mm) => mm.id === e.target.value);
      section.querySelector('.model-cost').innerHTML = costBadge(m ? m.cost : 'cheap');
      saveSettings();
    };
    const refreshBtn = section.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.onclick = async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ Chargement...';
        await loadOpenRouterModels(true);
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Recharger la liste';
        SettingsView(root);
        toast(`${PROVIDERS[id].models.length} modèles chargés`, 'success');
      };
    }
    section.querySelector('[data-action="toggleEye"]').onclick = () => {
      const inp = section.querySelector('[data-field="key"]');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    };
    section.querySelector('[data-action="test"]').onclick = async (e) => {
      const btn = e.currentTarget;
      const resultEl = section.querySelector('.test-result');
      const cfg = state.settings.providers[id];
      if (!cfg.key) {
        resultEl.textContent = '❌ Clé manquante';
        resultEl.className = 'test-result fail';
        return;
      }
      btn.disabled = true;
      resultEl.textContent = '⏳ Test...';
      resultEl.className = 'test-result';
      const { text, error } = await callProvider(
        id,
        { key: cfg.key, model: cfg.defaultModel },
        [{ role: 'user', content: 'Dis juste "ok".' }],
        'Réponds par un seul mot.',
        { maxTokens: 10 }
      );
      btn.disabled = false;
      if (error) {
        resultEl.textContent = `❌ ${error}`;
        resultEl.className = 'test-result fail';
      } else {
        resultEl.textContent = `✅ OK (${(text || '').slice(0, 30).trim()})`;
        resultEl.className = 'test-result ok';
      }
    };
  });

  root.querySelector('#themeSelect').onchange = (e) => {
    state.settings.theme = e.target.value;
    saveSettings();
    applyTheme();
  };
  root.querySelector('#tokensRange').oninput = (e) => {
    state.settings.maxTokensPerTurn = parseInt(e.target.value, 10);
    e.target.previousElementSibling.textContent = `Tokens max par réponse (${e.target.value})`;
    saveSettings();
  };
  root.querySelector('#autoPlay').onchange = (e) => {
    state.settings.autoPlay = e.target.checked;
    saveSettings();
  };
  // Auto-rerender when OpenRouter models finish loading in the background
  if (PROVIDERS.openrouter.dynamic && PROVIDERS.openrouter.models.length < 5) {
    loadOpenRouterModels().then((list) => {
      if (list.length >= 5 && document.body.contains(root)) {
        SettingsView(root);
      }
    });
  }

  root.querySelector('#resetKeys').onclick = () => {
    if (confirm('Effacer TOUTES les clés API ? Cette action est irréversible.')) {
      resetAllKeys();
      toast('Clés effacées', 'success');
      SettingsView(root);
    }
  };
}

function escapeAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
