// src/renderer/onboarding.js — Wizard 4 étapes
window.Onboarding = (() => {
  const STATE = {
    step: 1,
    mode: null,
    apiProvider: 'anthropic',
    apiKey: '',
    webviewProvider: 'claude',
    profile: { name: '', founder: '', industry: '', country: 'France', description: '', audience: '', website: '', tone: 'professionnel et chaleureux' }
  };

  let pollInterval = null;

  function $(id) { return document.getElementById(id); }

  function progressBar(step) {
    let html = '<div class="ob-progress">';
    for (let i = 1; i <= 4; i++) {
      const cls = i < step ? 'done' : (i === step ? 'active' : '');
      html += `<div class="ob-step-circle ${cls}">${i < step ? '✓' : i}</div>`;
      if (i < 4) html += `<div class="ob-step-line ${i < step ? 'done' : ''}"></div>`;
    }
    return html + '</div>';
  }

  function renderStep1() {
    return `
      ${progressBar(1)}
      <div class="ob-card">
        <h1 class="ob-hero">EntrepreneurOS</h1>
        <p class="ob-tagline">10 modules IA pour piloter votre activité solo. Business plan, factures, propositions, légal, growth — tout au même endroit.</p>
        <div class="ob-features">
          <div class="ob-feat"><div class="ob-feat-ico">⚡</div><div class="ob-feat-title">10 modules</div><div class="ob-feat-desc">Tous les documents essentiels d'un entrepreneur solo</div></div>
          <div class="ob-feat"><div class="ob-feat-ico">🔒</div><div class="ob-feat-title">100% local</div><div class="ob-feat-desc">Vos données restent sur votre machine, clés chiffrées</div></div>
          <div class="ob-feat"><div class="ob-feat-ico">🧠</div><div class="ob-feat-title">3 modes IA</div><div class="ob-feat-desc">API key, web direct ou local — vous choisissez</div></div>
        </div>
        <div class="ob-footer">
          <span></span>
          <button class="btn btn-primary" id="ob-next">Commencer →</button>
        </div>
      </div>`;
  }

  function renderStep2() {
    return `
      ${progressBar(2)}
      <div class="ob-card">
        <h1 class="ob-hero" style="font-size:32px">Votre connexion IA</h1>
        <p class="ob-tagline">Choisissez comment EntrepreneurOS communique avec l'IA.</p>
        <div class="ob-modes">
          ${modeCard('api', '🔑', 'Clé API', '6 providers au choix : Anthropic, OpenAI, Gemini, Mistral, DeepSeek, Groq. Streaming + qualité max.')}
          ${modeCard('webview', '🌐', 'Web direct', 'Utilise ta session claude.ai ou chatgpt.com (gratuit, mais lent et fragile).')}
        </div>
        <div id="ob-mode-detail"></div>
        <div id="ob-test-result" class="ob-test-result"></div>
        <div class="ob-footer">
          <button class="btn btn-ghost" id="ob-back">← Retour</button>
          <button class="btn btn-primary" id="ob-next" ${STATE.mode ? '' : 'disabled'}>Continuer →</button>
        </div>
      </div>`;
  }

  function modeCard(id, ico, title, desc) {
    const sel = STATE.mode === id ? 'selected' : '';
    return `<div class="ob-mode-card ${sel}" data-mode="${id}">
      <div class="ob-mode-ico">${ico}</div>
      <div class="ob-mode-title">${title}</div>
      <div class="ob-mode-desc">${desc}</div>
    </div>`;
  }

  function modeDetailHTML() {
    if (STATE.mode === 'api') {
      return `<div class="ob-sub-form">
        <div class="field">
          <label>Provider IA</label>
          <select id="ob-api-provider">
            <option value="anthropic" ${STATE.apiProvider === 'anthropic' ? 'selected' : ''}>Anthropic Claude (qualité max)</option>
            <option value="openai" ${STATE.apiProvider === 'openai' ? 'selected' : ''}>OpenAI GPT-4o</option>
            <option value="gemini" ${STATE.apiProvider === 'gemini' ? 'selected' : ''}>Google Gemini (tier gratuit généreux)</option>
            <option value="mistral" ${STATE.apiProvider === 'mistral' ? 'selected' : ''}>Mistral AI (français)</option>
            <option value="deepseek" ${STATE.apiProvider === 'deepseek' ? 'selected' : ''}>DeepSeek (meilleur rapport prix/qualité)</option>
            <option value="groq" ${STATE.apiProvider === 'groq' ? 'selected' : ''}>Groq (ultra-rapide)</option>
          </select>
        </div>
        <div class="field">
          <label>Clé API</label>
          <input type="password" id="ob-api-key" placeholder="(colle ta clé du provider choisi)" value="${STATE.apiKey}" />
        </div>
        <button class="btn btn-sm" id="ob-test-api">Tester la clé</button>
      </div>`;
    }
    if (STATE.mode === 'webview') {
      return `<div class="ob-sub-form">
        <div class="field">
          <label>Service</label>
          <select id="ob-webview-provider">
            <option value="claude" ${STATE.webviewProvider === 'claude' ? 'selected' : ''}>Claude.ai</option>
            <option value="chatgpt" ${STATE.webviewProvider === 'chatgpt' ? 'selected' : ''}>ChatGPT</option>
          </select>
        </div>
        <p class="muted" style="margin-bottom:12px">Une fenêtre de connexion s'ouvrira. Connectez-vous une fois — la session est mémorisée.</p>
        <button class="btn btn-sm" id="ob-webview-login">Se connecter</button>
        <span id="ob-webview-status" class="muted" style="margin-left:12px"></span>
      </div>`;
    }
    return '';
  }

  function renderStep3() {
    const p = STATE.profile;
    return `
      ${progressBar(3)}
      <div class="ob-card">
        <h1 class="ob-hero" style="font-size:32px">Votre entreprise</h1>
        <p class="ob-tagline">Ces infos personnaliseront tous vos documents générés.</p>
        <div class="ob-form-grid">
          <div><label>Nom de l'entreprise *</label><input type="text" id="p-name" value="${p.name}" placeholder="Acme SAS" /></div>
          <div><label>Fondateur</label><input type="text" id="p-founder" value="${p.founder}" placeholder="Marie Dupont" /></div>
          <div><label>Secteur</label><input type="text" id="p-industry" value="${p.industry}" placeholder="SaaS B2B" /></div>
          <div><label>Pays</label><input type="text" id="p-country" value="${p.country}" placeholder="France" /></div>
          <div class="full"><label>Description</label><textarea id="p-description" placeholder="Ce que fait votre entreprise en 2-3 phrases">${p.description}</textarea></div>
          <div class="full"><label>Audience cible</label><input type="text" id="p-audience" value="${p.audience}" placeholder="Solopreneurs, PME 10-50 personnes" /></div>
          <div><label>Site web</label><input type="url" id="p-website" value="${p.website}" placeholder="https://exemple.com" /></div>
          <div><label>Ton éditorial</label><input type="text" id="p-tone" value="${p.tone}" placeholder="professionnel et chaleureux" /></div>
        </div>
        <div class="ob-footer">
          <button class="btn btn-ghost" id="ob-back">← Retour</button>
          <button class="btn btn-primary" id="ob-next">Continuer →</button>
        </div>
      </div>`;
  }

  function renderStep4() {
    return `
      ${progressBar(4)}
      <div class="ob-card">
        <h1 class="ob-hero" style="font-size:32px">Tout est prêt</h1>
        <p class="ob-tagline">Testons votre connexion IA et lançons EntrepreneurOS.</p>
        <div style="margin: 30px 0;">
          <button class="btn" id="ob-final-test">🔍 Tester la connexion IA</button>
        </div>
        <div id="ob-test-result" class="ob-test-result"></div>
        <div class="ob-footer">
          <button class="btn btn-ghost" id="ob-back">← Retour</button>
          <button class="btn btn-primary" id="ob-finish">Ouvrir EntrepreneurOS →</button>
        </div>
      </div>`;
  }

  function render() {
    const root = $('onboarding');
    let inner;
    if (STATE.step === 1) inner = renderStep1();
    else if (STATE.step === 2) inner = renderStep2();
    else if (STATE.step === 3) inner = renderStep3();
    else inner = renderStep4();
    root.innerHTML = `<div class="ob-container">${inner}</div>`;
    if (STATE.step === 2) renderModeDetail();
    bind();
  }

  function renderModeDetail() {
    const el = $('ob-mode-detail');
    if (el) el.innerHTML = modeDetailHTML();
    bindModeDetail();
  }

  function bind() {
    const back = $('ob-back');
    const next = $('ob-next');
    const finish = $('ob-finish');
    if (back)   back.addEventListener('click', () => { STATE.step--; render(); });
    if (next)   next.addEventListener('click', onNext);
    if (finish) finish.addEventListener('click', onFinish);

    document.querySelectorAll('.ob-mode-card').forEach((c) => {
      c.addEventListener('click', () => {
        STATE.mode = c.dataset.mode;
        render();
      });
    });

    const ft = $('ob-final-test');
    if (ft) ft.addEventListener('click', onFinalTest);
  }

  function bindModeDetail() {
    const ap = $('ob-api-provider');
    if (ap) ap.addEventListener('change', (e) => { STATE.apiProvider = e.target.value; });
    const ak = $('ob-api-key');
    if (ak) ak.addEventListener('input', (e) => { STATE.apiKey = e.target.value; });

    const KEY_BY_PROVIDER = {
      anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY', mistral: 'MISTRAL_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY', groq: 'GROQ_API_KEY'
    };
    const ta = $('ob-test-api');
    if (ta) ta.addEventListener('click', async () => {
      const result = $('ob-test-result'); result.className = 'ob-test-result show';
      result.textContent = 'Test en cours…';
      try {
        const keyName = KEY_BY_PROVIDER[STATE.apiProvider] || 'ANTHROPIC_API_KEY';
        const r = await window.eos.keysTest(keyName, STATE.apiKey);
        if (r.valid) { result.classList.add('ok'); result.textContent = '✅ Clé valide — ' + (r.info || ''); }
        else { result.classList.add('fail'); result.textContent = '❌ ' + (r.error || 'Invalide'); }
      } catch (e) { result.classList.add('fail'); result.textContent = '❌ ' + e.message; }
    });

    const wp = $('ob-webview-provider');
    if (wp) wp.addEventListener('change', async (e) => {
      STATE.webviewProvider = e.target.value;
      await window.eos.updateConnectionConfig({ webviewProvider: e.target.value });
    });
    const wl = $('ob-webview-login');
    if (wl) wl.addEventListener('click', async () => {
      await window.eos.updateConnectionConfig({ webviewProvider: STATE.webviewProvider });
      await window.eos.webviewShowLogin();
      $('ob-webview-status').textContent = 'Fenêtre ouverte — connectez-vous…';
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(async () => {
        const ok = await window.eos.webviewIsLoggedIn().catch(() => false);
        if (ok) {
          clearInterval(pollInterval); pollInterval = null;
          await window.eos.webviewHideLogin();
          $('ob-webview-status').innerHTML = '<span style="color:var(--green)">✓ Connecté</span>';
        }
      }, 2000);
    });

  }

  async function onNext() {
    if (STATE.step === 1) { STATE.step = 2; render(); return; }
    if (STATE.step === 2) {
      if (!STATE.mode) return;
      // Persiste la config
      await window.eos.setConnectionMode(STATE.mode);
      const patch = {};
      if (STATE.mode === 'api') patch.apiProvider = STATE.apiProvider;
      if (STATE.mode === 'webview') patch.webviewProvider = STATE.webviewProvider;
      await window.eos.updateConnectionConfig(patch);
      if (STATE.mode === 'api' && STATE.apiKey) {
        const keyMap = { anthropic:'ANTHROPIC_API_KEY', openai:'OPENAI_API_KEY', gemini:'GEMINI_API_KEY', mistral:'MISTRAL_API_KEY', deepseek:'DEEPSEEK_API_KEY', groq:'GROQ_API_KEY' };
        const keyName = keyMap[STATE.apiProvider] || 'ANTHROPIC_API_KEY';
        await window.eos.keysSet(keyName, STATE.apiKey);
      }
      STATE.step = 3; render(); return;
    }
    if (STATE.step === 3) {
      // Capture profil
      ['name', 'founder', 'industry', 'country', 'description', 'audience', 'website', 'tone'].forEach((k) => {
        const el = $('p-' + k); if (el) STATE.profile[k] = el.value.trim();
      });
      if (!STATE.profile.name) { alert('Le nom de l\'entreprise est requis.'); return; }
      await window.eos.saveProfile(STATE.profile);
      STATE.step = 4; render(); return;
    }
  }

  async function onFinalTest() {
    const result = $('ob-test-result'); result.className = 'ob-test-result show';
    result.textContent = 'Test de la connexion IA…';
    const r = await window.eos.testConnection();
    if (r.ok) { result.classList.add('ok'); result.textContent = '✅ Connexion OK — ' + (r.note || 'prêt à générer'); }
    else { result.classList.add('fail'); result.textContent = '❌ ' + (r.error || 'échec') + (r.install ? ' — ' + r.install : ''); }
  }

  async function onFinish() {
    localStorage.setItem('eos_onboarding_done', '1');
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    if (window.App) window.App.start();
  }

  async function shouldShow() {
    if (!localStorage.getItem('eos_onboarding_done')) return true;
    try {
      const p = await window.eos.getProfile();
      return !p || !p.name;
    } catch { return true; }
  }

  async function start() {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    // Préremplir le profil si existe
    try {
      const p = await window.eos.getProfile();
      if (p && p.name) Object.assign(STATE.profile, p);
      const cfg = await window.eos.getConnectionConfig();
      if (cfg) {
        STATE.apiProvider = cfg.apiProvider || STATE.apiProvider;
        STATE.webviewProvider = cfg.webviewProvider || STATE.webviewProvider;
      }
    } catch {}
    render();
  }

  return { start, shouldShow };
})();
