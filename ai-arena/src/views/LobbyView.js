import { state, getEnabledProviders } from '../state.js';
import { PROVIDERS, loadOpenRouterModels } from '../providers/index.js';
import { MODES } from '../modes/index.js';
import { navigate } from '../router.js';
import { toast } from '../components/Toast.js';

function costBadge(cost) {
  if (cost === 'cheap') return '<span class="badge badge-cheap">💚</span>';
  if (cost === 'mid') return '<span class="badge badge-mid">💛</span>';
  return '<span class="badge badge-pricey">🔴</span>';
}

function buildModelOptions(providerId, selectedModel) {
  if (!providerId || !PROVIDERS[providerId]) return '';
  const list = [...PROVIDERS[providerId].models];
  if (selectedModel && !list.find((m) => m.id === selectedModel)) {
    list.unshift({ id: selectedModel, label: selectedModel, cost: 'cheap' });
  }
  return list.map((m) =>
    `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.label} ${m.cost === 'cheap' ? '💚' : m.cost === 'mid' ? '💛' : '🔴'}</option>`
  ).join('');
}

export function LobbyView(root, params = {}) {
  const modeId = params.modeId || 'clash';
  const mode = MODES[modeId];
  if (!mode) { navigate('home'); return; }

  const enabled = getEnabledProviders();
  if (enabled.length < 2) {
    root.innerHTML = `
      <h1>${mode.emoji} ${mode.name}</h1>
      <div class="warning">
        Tu as besoin d'au moins 2 providers configurés.
        <button class="btn btn-small" id="goSettings" style="margin-left: 8px;">Configurer →</button>
      </div>
    `;
    root.querySelector('#goSettings').onclick = () => navigate('settings');
    return;
  }

  // Defaults: first two distinct providers (or same with first two models)
  const defaultA = { provider: enabled[0], model: state.settings.providers[enabled[0]].defaultModel, name: '' };
  const defaultB = {
    provider: enabled[1] || enabled[0],
    model: state.settings.providers[enabled[1] || enabled[0]].defaultModel,
    name: ''
  };

  const providerOptionsHtml = (selected) => enabled.map((id) =>
    `<option value="${id}" ${id === selected ? 'selected' : ''}>${PROVIDERS[id].label}</option>`
  ).join('');

  root.innerHTML = `
    <button class="btn btn-ghost btn-small" id="back">← Modes</button>
    <h1 style="margin-top: 12px;">${mode.emoji} ${mode.name}</h1>
    <p class="subtitle">${mode.tagline}</p>

    <div class="lobby-grid">
      <div class="card lobby-card-red" id="cardA">
        <div class="card-title"><span class="ai-tag-red">●</span> IA Rouge — ${mode.build('').labelA || 'A'}</div>
        <div class="field">
          <label class="field-label">Provider</label>
          <select data-side="A" data-field="provider">${providerOptionsHtml(defaultA.provider)}</select>
        </div>
        <div class="field">
          <label class="field-label">Modèle</label>
          <select data-side="A" data-field="model">${buildModelOptions(defaultA.provider, defaultA.model)}</select>
        </div>
        <div class="field">
          <label class="field-label">Nom personnalisé (optionnel)</label>
          <input type="text" data-side="A" data-field="name" placeholder="${PROVIDERS[defaultA.provider].label}" />
        </div>
        ${mode.customPrompts ? `
          <div class="field">
            <label class="field-label">🎨 Rôle / Personnalité (optionnel)</label>
            <textarea data-side="A" data-field="prompt" rows="4" placeholder="Ex: Tu es un pirate du 18e siècle, tu parles avec l'accent de Marseille et tu adores les blagues."></textarea>
          </div>
        ` : ''}
      </div>

      <div class="vs-divider">VS</div>

      <div class="card lobby-card-blue" id="cardB">
        <div class="card-title"><span class="ai-tag-blue">●</span> IA Bleue — ${mode.build('').labelB || 'B'}</div>
        <div class="field">
          <label class="field-label">Provider</label>
          <select data-side="B" data-field="provider">${providerOptionsHtml(defaultB.provider)}</select>
        </div>
        <div class="field">
          <label class="field-label">Modèle</label>
          <select data-side="B" data-field="model">${buildModelOptions(defaultB.provider, defaultB.model)}</select>
        </div>
        <div class="field">
          <label class="field-label">Nom personnalisé (optionnel)</label>
          <input type="text" data-side="B" data-field="name" placeholder="${PROVIDERS[defaultB.provider].label}" />
        </div>
        ${mode.customPrompts ? `
          <div class="field">
            <label class="field-label">🎨 Rôle / Personnalité (optionnel)</label>
            <textarea data-side="B" data-field="prompt" rows="4" placeholder="Ex: Tu es un robot du futur très logique qui ne comprend pas l'humour."></textarea>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="card">
      <div class="field">
        <label class="field-label">${mode.subjectLabel}</label>
        <input type="text" id="subject" placeholder="${mode.subjectPlaceholder}" />
      </div>
      <div class="field">
        <label class="field-label">Nombre de tours</label>
        <select id="turns">
          <option value="5">5 tours</option>
          <option value="10" selected>10 tours</option>
          <option value="15">15 tours</option>
          <option value="20">20 tours</option>
          <option value="30">30 tours</option>
          <option value="50">50 tours</option>
          <option value="0">♾️ Illimité (tu termines quand tu veux)</option>
        </select>
      </div>
    </div>

    <button class="btn btn-primary btn-block" id="start" style="font-size: 16px; padding: 16px;">🎬 Lancer la partie</button>
  `;

  const lobby = { A: { ...defaultA }, B: { ...defaultB } };

  root.querySelectorAll('select[data-side], input[data-side], textarea[data-side]').forEach((el) => {
    el.onchange = el.oninput = () => {
      const side = el.dataset.side;
      const field = el.dataset.field;
      lobby[side][field] = el.value;
      if (field === 'provider') {
        // refresh model dropdown
        const newDefault = state.settings.providers[el.value]?.defaultModel || PROVIDERS[el.value].models[0].id;
        lobby[side].model = newDefault;
        const modelSel = root.querySelector(`select[data-side="${side}"][data-field="model"]`);
        modelSel.innerHTML = buildModelOptions(el.value, newDefault);
        const nameInp = root.querySelector(`input[data-side="${side}"][data-field="name"]`);
        nameInp.placeholder = PROVIDERS[el.value].label;
      }
    };
  });

  root.querySelector('#back').onclick = () => navigate('home');

  // Refresh dropdowns once OpenRouter list arrives
  if (PROVIDERS.openrouter.dynamic && PROVIDERS.openrouter.models.length < 5 &&
      (lobby.A.provider === 'openrouter' || lobby.B.provider === 'openrouter')) {
    loadOpenRouterModels().then(() => {
      if (document.body.contains(root)) LobbyView(root, params);
    });
  }

  root.querySelector('#start').onclick = () => {
    if (lobby.A.provider === lobby.B.provider && lobby.A.model === lobby.B.model) {
      toast('Choisis au moins un modèle différent entre les deux IA.', 'error', 4000);
      return;
    }
    const subject = root.querySelector('#subject').value.trim();
    const turns = parseInt(root.querySelector('#turns').value, 10);
    state.game = {
      modeId,
      subject,
      turns,
      A: { ...lobby.A },
      B: { ...lobby.B },
      customPrompts: mode.customPrompts ? {
        promptA: lobby.A.prompt || '',
        promptB: lobby.B.prompt || ''
      } : null
    };
    navigate('game');
  };
}
