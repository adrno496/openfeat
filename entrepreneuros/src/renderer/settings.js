// src/renderer/settings.js — UI Paramètres (3 onglets)
window.Settings = (() => {
  let currentTab = 'connection';
  let pollLogin = null;

  async function render(target) {
    target.innerHTML = `
      <div class="settings-header">
        <h1>Paramètres</h1>
        <p class="muted">Connexion IA, clés API, profil entreprise</p>
      </div>
      <div class="settings-tabs">
        <button class="settings-tab ${currentTab === 'connection' ? 'active' : ''}" data-tab="connection">Connexion IA</button>
        <button class="settings-tab ${currentTab === 'keys' ? 'active' : ''}" data-tab="keys">Clés API</button>
        <button class="settings-tab ${currentTab === 'profile' ? 'active' : ''}" data-tab="profile">Profil</button>
        <button class="settings-tab ${currentTab === 'usage' ? 'active' : ''}" data-tab="usage">💸 Usage</button>
        <button class="settings-tab ${currentTab === 'appearance' ? 'active' : ''}" data-tab="appearance">Apparence</button>
        <button class="settings-tab ${currentTab === 'advanced' ? 'active' : ''}" data-tab="advanced">Avancé</button>
      </div>
      <div class="settings-section" id="settings-body"></div>`;

    target.querySelectorAll('.settings-tab').forEach((b) => {
      b.addEventListener('click', () => { currentTab = b.dataset.tab; render(target); });
    });

    const body = document.getElementById('settings-body');
    if (currentTab === 'connection') await renderConnection(body);
    else if (currentTab === 'keys') await renderKeys(body);
    else if (currentTab === 'usage') await renderUsage(body);
    else if (currentTab === 'appearance') await renderAppearance(body);
    else if (currentTab === 'advanced') await renderAdvanced(body);
    else await renderProfile(body);
  }

  // ---------- Usage / Consommation API ----------
  async function renderUsage(body) {
    const u = await window.eos.getUsage();
    const fmt$ = (n) => '$' + (n || 0).toFixed(n < 0.01 ? 4 : (n < 1 ? 3 : 2));
    const fmtTok = (n) => {
      if (n < 1000) return String(n);
      if (n < 1_000_000) return (n/1000).toFixed(1) + 'k';
      return (n/1_000_000).toFixed(2) + 'M';
    };
    const PROVIDER_LABELS = {
      anthropic: 'Anthropic Claude',
      openai: 'OpenAI', gemini: 'Google Gemini',
      mistral: 'Mistral AI', deepseek: 'DeepSeek', groq: 'Groq'
    };
    const providers = Object.entries(u.byProvider || {}).sort((a, b) => b[1].costUSD - a[1].costUSD);
    const modules = Object.entries(u.byModule || {}).sort((a, b) => b[1].costUSD - a[1].costUSD);

    // Derniers 7 jours
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      days.push({ key: k, label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }), data: (u.byDay && u.byDay[k]) || { calls: 0, costUSD: 0 } });
    }
    const maxDayCost = Math.max(...days.map(d => d.data.costUSD), 0.001);

    body.innerHTML = `
      <div class="profile-form" style="grid-template-columns:1fr">
        <h3 class="profile-section-title" style="grid-column:1">Vue globale</h3>
        <div class="full">
          <div class="usage-grid">
            <div class="usage-stat"><div class="us-num">${fmt$(u.totals.costUSD)}</div><div class="us-lab">coût total estimé</div></div>
            <div class="usage-stat"><div class="us-num">${u.totals.calls}</div><div class="us-lab">appels API</div></div>
            <div class="usage-stat"><div class="us-num">${fmtTok(u.totals.inputTokens)}</div><div class="us-lab">tokens entrée</div></div>
            <div class="usage-stat"><div class="us-num">${fmtTok(u.totals.outputTokens)}</div><div class="us-lab">tokens sortie</div></div>
            <div class="usage-stat"><div class="us-num">${fmtTok(u.totals.cachedTokens)}</div><div class="us-lab">tokens cachés</div></div>
            <div class="usage-stat"><div class="us-num">${u.totals.calls > 0 ? fmt$(u.totals.costUSD / u.totals.calls) : '—'}</div><div class="us-lab">coût moyen / appel</div></div>
          </div>
          <p class="muted" style="font-size:11px;margin-top:8px">⚠ Coûts indicatifs basés sur les tarifs publics 2026. Vérifie sur la console de ton provider pour le coût réel facturé.</p>
        </div>

        <h3 class="profile-section-title" style="grid-column:1">7 derniers jours</h3>
        <div class="full">
          <div class="usage-bars">
            ${days.map(d => `
              <div class="ub-col">
                <div class="ub-bar" style="height:${Math.max(2, (d.data.costUSD / maxDayCost) * 100)}%" title="${fmt$(d.data.costUSD)} · ${d.data.calls} appels"></div>
                <div class="ub-lab">${d.label}</div>
                <div class="ub-val">${d.data.costUSD > 0 ? fmt$(d.data.costUSD) : '—'}</div>
              </div>`).join('')}
          </div>
        </div>

        <h3 class="profile-section-title" style="grid-column:1">Par provider</h3>
        <div class="full">
          ${providers.length ? `<table class="usage-table">
            <thead><tr><th>Provider</th><th>Appels</th><th>Tokens IN</th><th>Tokens OUT</th><th>Cachés</th><th>Coût</th></tr></thead>
            <tbody>${providers.map(([prov, p]) => `
              <tr>
                <td>${PROVIDER_LABELS[prov] || prov}</td>
                <td>${p.calls}</td>
                <td>${fmtTok(p.inputTokens)}</td>
                <td>${fmtTok(p.outputTokens)}</td>
                <td>${fmtTok(p.cachedTokens)}</td>
                <td><strong>${fmt$(p.costUSD)}</strong></td>
              </tr>`).join('')}</tbody>
          </table>` : '<div class="muted" style="font-size:12px;text-align:center;padding:14px">Aucune utilisation enregistrée. Lance une génération pour démarrer le compteur.</div>'}
        </div>

        ${modules.length ? `
        <h3 class="profile-section-title" style="grid-column:1">Top modules consommateurs</h3>
        <div class="full">
          <table class="usage-table">
            <thead><tr><th>Module</th><th>Appels</th><th>Coût</th></tr></thead>
            <tbody>${modules.slice(0, 10).map(([m, d]) => `
              <tr>
                <td>${m}</td>
                <td>${d.calls}</td>
                <td>${fmt$(d.costUSD)}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : ''}

        <h3 class="profile-section-title" style="grid-column:1">Actions</h3>
        <div class="full" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" id="usage-refresh">🔄 Rafraîchir</button>
          <button class="btn btn-danger" id="usage-reset">🗑 Réinitialiser le compteur</button>
        </div>
      </div>`;

    document.getElementById('usage-refresh').addEventListener('click', () => renderUsage(body));
    document.getElementById('usage-reset').addEventListener('click', async () => {
      if (!confirm('Réinitialiser le compteur de consommation ? Cela ne supprime PAS tes documents générés.')) return;
      await window.eos.resetUsage();
      window.Dashboard.toast('Compteur remis à zéro', 'success');
      renderUsage(body);
    });
  }

  // ---------- Apparence ----------
  async function renderAppearance(body) {
    const APPEARANCE_KEY = 'eos.appearance';
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}'); } catch {}
    const accent = cfg.accent || '#e8d5a3';
    const appName = cfg.appName || 'EntrepreneurOS';
    const subtitle = cfg.subtitle || 'v2 · 21 modules';
    const defaultTheme = cfg.defaultTheme || 'dark';
    const ACCENT_PRESETS = [
      { name: 'Or (défaut)',   color: '#e8d5a3' },
      { name: 'Émeraude',      color: '#7ec89a' },
      { name: 'Saphir',        color: '#7aa8e8' },
      { name: 'Rubis',         color: '#e07a7a' },
      { name: 'Améthyste',     color: '#b89aef' },
      { name: 'Cuivre',        color: '#d49a6a' },
      { name: 'Menthe',        color: '#9adcc9' },
      { name: 'Rose',          color: '#e8a3c4' }
    ];

    body.innerHTML = `
      <div class="profile-form">
        <h3 class="profile-section-title">Identité de l'app</h3>
        <div class="full">
          <label>Nom affiché</label>
          <input type="text" id="ap-name" value="${appName.replace(/"/g, '&quot;')}" placeholder="EntrepreneurOS" />
        </div>
        <div class="full">
          <label>Sous-titre sidebar</label>
          <input type="text" id="ap-subtitle" value="${subtitle.replace(/"/g, '&quot;')}" placeholder="v2 · 21 modules" />
        </div>

        <h3 class="profile-section-title">Couleur d'accent</h3>
        <div class="full">
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
            ${ACCENT_PRESETS.map(p => `
              <button type="button" class="accent-preset" data-color="${p.color}" title="${p.name}" style="background:${p.color};${accent === p.color ? 'box-shadow:0 0 0 3px var(--bg-0), 0 0 0 5px ' + p.color + ';' : ''}"></button>`).join('')}
          </div>
          <label>Couleur personnalisée (hex)</label>
          <input type="color" id="ap-accent" value="${accent}" style="height:42px;cursor:pointer;width:100%" />
        </div>

        <h3 class="profile-section-title">Thème par défaut</h3>
        <div class="full">
          <label>Au démarrage</label>
          <select id="ap-theme">
            <option value="dark"  ${defaultTheme === 'dark' ? 'selected' : ''}>Sombre (recommandé)</option>
            <option value="light" ${defaultTheme === 'light' ? 'selected' : ''}>Clair</option>
            <option value="auto"  ${defaultTheme === 'auto' ? 'selected' : ''}>Automatique (selon système)</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-primary" id="ap-save">Appliquer</button>
          <button type="button" class="btn" id="ap-reset">Réinitialiser l'apparence</button>
        </div>
      </div>`;

    const apply = (config) => {
      try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(config)); } catch {}
      document.documentElement.style.setProperty('--accent', config.accent || '#e8d5a3');
      document.documentElement.style.setProperty('--accent-dim', hexToRgba(config.accent || '#e8d5a3', 0.15));
      document.documentElement.style.setProperty('--accent-glow', hexToRgba(config.accent || '#e8d5a3', 0.06));
      document.querySelectorAll('.brand-name, .sb-title').forEach((el) => {
        if (el.classList.contains('sb-title')) el.textContent = config.appName || 'EntrepreneurOS';
        else if (el.classList.contains('brand-name')) el.textContent = config.appName || 'EntrepreneurOS';
      });
      const sub = document.querySelector('.sb-sub');
      if (sub) sub.textContent = config.subtitle || 'v2 · 21 modules';
      if (config.defaultTheme && config.defaultTheme !== 'auto') {
        document.documentElement.setAttribute('data-theme', config.defaultTheme);
        try { localStorage.setItem('eos.theme', config.defaultTheme); } catch {}
      }
    };

    body.querySelectorAll('.accent-preset').forEach((b) => {
      b.addEventListener('click', () => { document.getElementById('ap-accent').value = b.dataset.color; });
    });
    document.getElementById('ap-save').addEventListener('click', () => {
      const newCfg = {
        accent: document.getElementById('ap-accent').value,
        appName: document.getElementById('ap-name').value.trim() || 'EntrepreneurOS',
        subtitle: document.getElementById('ap-subtitle').value.trim() || 'v2 · 21 modules',
        defaultTheme: document.getElementById('ap-theme').value
      };
      apply(newCfg);
      window.Dashboard.toast('Apparence appliquée', 'success');
      renderAppearance(body);
    });
    document.getElementById('ap-reset').addEventListener('click', () => {
      try { localStorage.removeItem(APPEARANCE_KEY); } catch {}
      apply({ accent: '#e8d5a3', appName: 'EntrepreneurOS', subtitle: 'v2 · 21 modules', defaultTheme: 'dark' });
      window.Dashboard.toast('Apparence réinitialisée', 'success');
      renderAppearance(body);
    });
  }

  function hexToRgba(hex, alpha) {
    const m = hex.replace('#', '');
    const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
    const r = parseInt(v.substr(0, 2), 16);
    const g = parseInt(v.substr(2, 2), 16);
    const b = parseInt(v.substr(4, 2), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ---------- Avancé ----------
  async function renderAdvanced(body) {
    body.innerHTML = `
      <div class="profile-form" style="grid-template-columns:1fr">
        <h3 class="profile-section-title" style="grid-column:1">Sauvegarde & restauration</h3>
        <div class="full" style="display:flex;flex-direction:column;gap:10px">
          <p class="muted" style="font-size:12px">Toutes tes données (profil, clés chiffrées, documents générés, configurations) sont stockées localement. Tu peux exporter une sauvegarde JSON pour migrer ou archiver.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn" id="adv-export">📦 Exporter toutes les données</button>
            <button class="btn" id="adv-import">📥 Importer une sauvegarde</button>
            <button class="btn" id="adv-open-folder">📁 Ouvrir le dossier de données</button>
          </div>
        </div>

        <h3 class="profile-section-title" style="grid-column:1;margin-top:20px">Réinitialisation</h3>
        <div class="full" style="display:flex;flex-direction:column;gap:10px">
          <p class="muted" style="font-size:12px">⚠ <strong style="color:var(--red)">Action destructive</strong>. Choisis ce que tu veux conserver, le reste sera effacé définitivement.</p>
          <label class="ck"><input type="checkbox" id="adv-keep-profile" checked /> Conserver le profil entreprise</label>
          <label class="ck"><input type="checkbox" id="adv-keep-keys" checked /> Conserver les clés API (chiffrées)</label>
          <label class="ck"><input type="checkbox" id="adv-keep-config" checked /> Conserver la config IA (provider, mode)</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
            <button class="btn btn-danger" id="adv-reset-soft">🧹 Effacer les documents générés</button>
            <button class="btn btn-danger" id="adv-reset-all">💣 Tout effacer (reset complet)</button>
          </div>
        </div>

        <h3 class="profile-section-title" style="grid-column:1;margin-top:20px">Préférences UI</h3>
        <div class="full" style="display:flex;flex-direction:column;gap:10px">
          <button class="btn" id="adv-clear-drafts">🗑 Effacer les brouillons de formulaires</button>
          <button class="btn" id="adv-clear-attachments">🗑 Effacer les pièces jointes mémorisées</button>
        </div>
      </div>`;

    document.getElementById('adv-export').addEventListener('click', async () => {
      try {
        const r = await window.eos.exportAll();
        if (r.canceled) return;
        window.Dashboard.toast(`✓ ${r.count} fichiers exportés`, 'success');
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });

    document.getElementById('adv-import').addEventListener('click', async () => {
      if (!confirm('Importer remplacera les données existantes par celles du fichier. Continuer ?')) return;
      try {
        const r = await window.eos.importAll();
        if (r.canceled) return;
        window.Dashboard.toast(`✓ ${r.count} fichiers restaurés. Recharge l'app pour voir les changements.`, 'success');
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });

    document.getElementById('adv-open-folder').addEventListener('click', async () => {
      try { await window.eos.openDataFolder(); } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });

    document.getElementById('adv-reset-soft').addEventListener('click', async () => {
      if (!confirm('Effacer TOUS les documents générés ? Profil, clés et config seront conservés.')) return;
      try {
        const r = await window.eos.resetAll({ keepProfile: true, keepKeys: true, keepConfig: true });
        window.Dashboard.toast(`✓ ${r.removed} éléments effacés`, 'success');
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });

    document.getElementById('adv-reset-all').addEventListener('click', async () => {
      const keep = {
        keepProfile: document.getElementById('adv-keep-profile').checked,
        keepKeys: document.getElementById('adv-keep-keys').checked,
        keepConfig: document.getElementById('adv-keep-config').checked
      };
      const what = keep.keepProfile && keep.keepKeys && keep.keepConfig
        ? 'tous les documents générés (profil + clés + config conservés)'
        : 'tout sauf les éléments cochés';
      if (!confirm(`⚠ Tu vas effacer ${what}. Cette action est IRRÉVERSIBLE.\n\nEs-tu sûr ?`)) return;
      if (!confirm('Vraiment sûr ? Dernière chance avant suppression définitive.')) return;
      try {
        const r = await window.eos.resetAll(keep);
        // Aussi nettoyer le localStorage si on supprime tout
        if (!keep.keepProfile && !keep.keepKeys && !keep.keepConfig) {
          try { localStorage.clear(); } catch {}
        }
        window.Dashboard.toast(`✓ ${r.removed} éléments effacés. Recharge l'app.`, 'success');
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });

    document.getElementById('adv-clear-drafts').addEventListener('click', () => {
      try {
        let n = 0;
        for (const k of Object.keys(localStorage)) if (k.startsWith('eos.draft.')) { localStorage.removeItem(k); n++; }
        window.Dashboard.toast(`✓ ${n} brouillons effacés`, 'success');
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });

    document.getElementById('adv-clear-attachments').addEventListener('click', () => {
      try {
        let n = 0;
        for (const k of Object.keys(localStorage)) if (k.startsWith('eos.attach.')) { localStorage.removeItem(k); n++; }
        window.Dashboard.toast(`✓ ${n} listes de pièces jointes effacées`, 'success');
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });
  }

  // ---------- Connexion ----------
  async function renderConnection(body) {
    const cfg = await window.eos.getConnectionConfig();
    body.innerHTML = `
      <div class="mode-cards">
        ${modeCard('api', '🔑', 'Clé API', 'Anthropic, OpenAI, Gemini, Mistral, DeepSeek, Groq', cfg.mode)}
        ${modeCard('webview', '🌐', 'Web direct', 'claude.ai / chatgpt.com (sans clé)', cfg.mode)}
      </div>
      <div class="mode-comparison" style="margin: 20px 0; padding: 18px; background: var(--bg-1); border: 1px solid var(--border); border-radius: 10px; font-size: 13px;">
        <h4 style="font-family: var(--font-display); color: var(--text-0); margin-bottom: 12px; font-size: 14px;">📊 API vs Web direct</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; color: var(--text-1);">
          <div>
            <div style="color: var(--accent); font-weight: 600; margin-bottom: 6px;">🔑 Mode API</div>
            <div style="font-size: 12px; line-height: 1.6;">
              <div style="color: var(--green); margin-bottom: 4px;">✓ Streaming live (réponse au fil de l'eau)</div>
              <div style="color: var(--green); margin-bottom: 4px;">✓ Rapide (5-30s)</div>
              <div style="color: var(--green); margin-bottom: 4px;">✓ Fiable, ne casse pas</div>
              <div style="color: var(--green); margin-bottom: 4px;">✓ 6 providers au choix</div>
              <div style="color: var(--green); margin-bottom: 8px;">✓ Prompt caching (-90% coût)</div>
              <div style="color: var(--red);">✗ Payant (qq centimes / génération)</div>
            </div>
          </div>
          <div>
            <div style="color: var(--accent); font-weight: 600; margin-bottom: 6px;">🌐 Mode Web direct</div>
            <div style="font-size: 12px; line-height: 1.6;">
              <div style="color: var(--green); margin-bottom: 4px;">✓ Gratuit (utilise ton plan claude.ai/chatgpt)</div>
              <div style="color: var(--green); margin-bottom: 8px;">✓ Pas besoin de clé API</div>
              <div style="color: var(--red); margin-bottom: 4px;">✗ Lent (30s-3min par génération)</div>
              <div style="color: var(--red); margin-bottom: 4px;">✗ Pas de streaming live</div>
              <div style="color: var(--red); margin-bottom: 4px;">✗ Casse à chaque refonte UI du site</div>
              <div style="color: var(--red);">✗ Peut être détecté comme bot</div>
            </div>
          </div>
        </div>
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 12px; color: var(--text-2);">
          💡 <strong style="color: var(--text-1);">Recommandation</strong> : commence en Web direct pour tester gratuitement, passe en API dès que tu utilises l'app sérieusement (5 € de crédit Anthropic = ~100 générations).
        </div>
      </div>
      <div class="mode-detail" id="mode-detail"></div>`;

    body.querySelectorAll('.mode-card-activate').forEach((b) => {
      b.addEventListener('click', async () => {
        await window.eos.setConnectionMode(b.dataset.mode);
        await window.App.refreshConnectionBadge();
        renderConnection(body);
      });
    });

    renderModeDetail(cfg);
  }

  function modeCard(id, ico, title, sub, currentMode) {
    const active = currentMode === id;
    return `<div class="mode-card ${active ? 'active' : ''}">
      <div style="font-size:24px; margin-bottom:8px">${ico}</div>
      <h3>${title}</h3>
      <div class="muted">${sub}</div>
      <div class="mode-card-actions">
        ${active
          ? '<span class="muted" style="color:var(--accent)">● Actif</span>'
          : `<button class="btn btn-sm mode-card-activate" data-mode="${id}">Activer</button>`}
      </div>
    </div>`;
  }

  async function renderModeDetail(cfg) {
    const el = document.getElementById('mode-detail');
    if (cfg.mode === 'api') {
      const PROVIDERS = [
        { value: 'anthropic', label: 'Anthropic Claude (4.5 / 4.6 / 4.7)', desc: 'La référence qualité. Streaming + prompt caching natif.', pricing: '~0.25 → 15 $/M tokens' },
        { value: 'openai',    label: 'OpenAI (GPT-4o / 4o-mini)',          desc: 'Très polyvalent, écosystème le plus mature.',           pricing: '~0.15 → 5 $/M tokens' },
        { value: 'gemini',    label: 'Google Gemini (2.0 / 2.5)',          desc: 'Tier gratuit généreux. Bon contexte long (2M tokens).', pricing: 'Gratuit + ~0.075 $/M' },
        { value: 'mistral',   label: 'Mistral AI (Large / Medium / 8B)',   desc: 'Provider français. Bon en français natif.',              pricing: '~0.10 → 2 $/M tokens' },
        { value: 'deepseek',  label: 'DeepSeek (Chat / Reasoner)',         desc: 'Le meilleur rapport qualité/prix du marché.',           pricing: '~0.14 $/M tokens' },
        { value: 'groq',      label: 'Groq (Llama 70B / 8B)',              desc: 'Inférence ultra-rapide (500+ tokens/s).',                pricing: 'Très bon marché' }
      ];
      el.innerHTML = `
        <h3>Configuration API</h3>
        <div class="field" style="margin-top:12px">
          <label>Provider IA</label>
          <select id="cfg-provider">
            ${PROVIDERS.map((p) => `<option value="${p.value}" ${cfg.apiProvider === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
          <div id="cfg-provider-desc" style="margin-top:10px; padding:10px 12px; background:var(--bg-1); border:1px solid var(--border); border-radius:6px; font-size:12px; color:var(--text-2)"></div>
        </div>
        <button class="btn" id="cfg-test">Tester la connexion</button>
        <div id="cfg-test-result"></div>
        <div style="margin-top:14px;font-size:12px;color:var(--text-2)">⚠️ Pense à coller ta clé API dans l'onglet "Clés API" pour le provider choisi.</div>`;
      const updateDesc = () => {
        const sel = document.getElementById('cfg-provider').value;
        const p = PROVIDERS.find((x) => x.value === sel);
        if (p) document.getElementById('cfg-provider-desc').innerHTML =
          `<strong style="color:var(--text-1)">${p.desc}</strong><br><span style="color:var(--accent)">Tarif : ${p.pricing}</span>`;
      };
      updateDesc();
      document.getElementById('cfg-provider').addEventListener('change', async (e) => {
        await window.eos.updateConnectionConfig({ apiProvider: e.target.value });
        updateDesc();
        window.App.refreshConnectionBadge();
      });
      bindTest('cfg-test', 'cfg-test-result', 'api');
    }
    else if (cfg.mode === 'webview') {
      el.innerHTML = `
        <h3>Connexion Web direct</h3>
        <div style="margin-top:10px;padding:14px;background:rgba(212,184,122,0.10);border:1px solid var(--yellow);border-radius:8px;font-size:12px;color:var(--text-1);line-height:1.6">
          <strong style="color:var(--yellow)">⚠ Mode expérimental</strong><br>
          Ce mode pilote claude.ai ou chatgpt.com en simulant un humain dans le navigateur. <strong>C'est lent (30s-3min), fragile, sans streaming live</strong>, et peut casser à chaque mise à jour des sites. Utile pour tester sans clé API, mais <strong>passe au mode API dès que tu utilises l'app sérieusement</strong>.
        </div>
        <div class="field" style="margin-top:14px">
          <label>Service web</label>
          <select id="cfg-webview-provider">
            <option value="claude" ${cfg.webviewProvider === 'claude' ? 'selected' : ''}>Claude.ai (recommandé)</option>
            <option value="chatgpt" ${cfg.webviewProvider === 'chatgpt' ? 'selected' : ''}>ChatGPT</option>
          </select>
        </div>
        <p style="font-size:12px;color:var(--text-2);margin-bottom:10px">Une fenêtre de connexion s'ouvrira par-dessus l'app. Connecte-toi normalement avec tes identifiants — la session est mémorisée dans <code>persist:eos-webview</code>.</p>
        <button class="btn" id="cfg-login">🔓 Se connecter</button>
        <button class="btn" id="cfg-test">Tester la connexion</button>
        <span class="muted" id="cfg-login-status" style="margin-left:10px"></span>
        <div id="cfg-test-result"></div>`;
      document.getElementById('cfg-webview-provider').addEventListener('change', async (e) => {
        await window.eos.updateConnectionConfig({ webviewProvider: e.target.value });
        window.App.refreshConnectionBadge();
      });
      document.getElementById('cfg-login').addEventListener('click', async () => {
        await window.eos.webviewShowLogin();
        const st = document.getElementById('cfg-login-status');
        st.textContent = 'Fenêtre ouverte — connectez-vous…';
        if (pollLogin) clearInterval(pollLogin);
        pollLogin = setInterval(async () => {
          const ok = await window.eos.webviewIsLoggedIn().catch(() => false);
          if (ok) {
            clearInterval(pollLogin); pollLogin = null;
            await window.eos.webviewHideLogin();
            st.innerHTML = '<span style="color:var(--green)">✓ Connecté</span>';
          }
        }, 2000);
      });
      bindTest('cfg-test', 'cfg-test-result', 'webview');
    }
    // Mode local supprimé. Si un ancien profil l'avait, on bascule en API.
    else if (cfg.mode === 'local') {
      window.eos.setConnectionMode('api').then(() => renderConnection(document.getElementById('settings-body')));
    }
  }

  function bindTest(btnId, resId, mode) {
    document.getElementById(btnId).addEventListener('click', async () => {
      const out = document.getElementById(resId);
      out.className = 'test-result-inline';
      out.style.display = 'block';
      out.textContent = 'Test en cours…';
      const r = await window.eos.testConnection(mode);
      if (r.ok) { out.className = 'test-result-inline ok'; out.textContent = '✅ ' + (r.note || 'OK'); }
      else { out.className = 'test-result-inline fail'; out.textContent = '❌ ' + (r.error || '') + (r.install ? ' — ' + r.install : ''); }
    });
  }

  // ---------- Clés ----------
  async function renderKeys(body) {
    const list = await window.eos.keysList();
    body.innerHTML = `
      <div class="keys-list">
        ${list.map((k) => `
          <div class="key-row">
            <div class="key-name">${k.name}</div>
            <input type="password" data-name="${k.name}" placeholder="${k.hasValue ? k.preview : 'non définie'}" />
            <div class="key-actions">
              <button class="btn btn-sm" data-act="save" data-name="${k.name}">Sauver</button>
              <button class="btn btn-sm" data-act="test" data-name="${k.name}">Tester</button>
              <button class="btn btn-sm btn-danger" data-act="del" data-name="${k.name}">×</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="key-info">🔒 Clés stockées chiffrées AES-256-GCM dans <code>data/keys.enc</code> avec une clé dérivée de votre machine.</div>`;

    body.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        const input = body.querySelector(`input[data-name="${name}"]`);
        const value = input.value;
        try {
          if (btn.dataset.act === 'save') {
            if (!value) { window.Dashboard.toast('Valeur vide', 'error'); return; }
            await window.eos.keysSet(name, value);
            window.Dashboard.toast(name + ' sauvegardée', 'success');
            input.value = ''; input.placeholder = '••••' + value.slice(-4);
          } else if (btn.dataset.act === 'test') {
            const v = value || (await window.eos.keysGet(name));
            if (!v) { window.Dashboard.toast('Aucune valeur à tester', 'error'); return; }
            window.Dashboard.toast('Test en cours…', 'success');
            const r = await window.eos.keysTest(name, v);
            window.Dashboard.toast(r.valid ? '✅ ' + (r.info || 'valide') : '❌ ' + r.error, r.valid ? 'success' : 'error');
          } else if (btn.dataset.act === 'del') {
            if (!confirm(`Supprimer ${name} ?`)) return;
            await window.eos.keysDelete(name);
            renderKeys(body);
          }
        } catch (e) { window.Dashboard.toast(e.message, 'error'); }
      });
    });
  }

  // ---------- Profil ----------
  async function renderProfile(body) {
    const p = await window.eos.getProfile();
    const esc = (s) => (s || '').toString().replace(/"/g, '&quot;');
    body.innerHTML = `
      <form class="profile-form" id="profile-form">
        <h3 class="profile-section-title">Identité & modèle</h3>
        <div><label>Nom de l'entreprise *</label><input type="text" name="name" value="${esc(p.name)}" required /></div>
        <div><label>Forme juridique</label><input type="text" name="legalForm" value="${esc(p.legalForm)}" placeholder="SAS, SARL, EI, Auto-entrepreneur…" /></div>
        <div><label>Fondateur / dirigeant</label><input type="text" name="founder" value="${esc(p.founder)}" /></div>
        <div><label>Secteur</label><input type="text" name="industry" value="${esc(p.industry)}" /></div>
        <div><label>Modèle d'entreprise *</label>
          <select name="businessModel">
            <option value="">— sélectionner —</option>
            <option value="saas" ${p.businessModel==='saas'?'selected':''}>SaaS / produit logiciel récurrent</option>
            <option value="service_b2b" ${p.businessModel==='service_b2b'?'selected':''}>Service B2B (conseil, prestation entreprise)</option>
            <option value="service_b2c" ${p.businessModel==='service_b2c'?'selected':''}>Service B2C (à des particuliers)</option>
            <option value="ecommerce" ${p.businessModel==='ecommerce'?'selected':''}>E-commerce / vente en ligne</option>
            <option value="commerce" ${p.businessModel==='commerce'?'selected':''}>Commerce physique / boutique</option>
            <option value="restauration" ${p.businessModel==='restauration'?'selected':''}>Restauration / food</option>
            <option value="artisanat" ${p.businessModel==='artisanat'?'selected':''}>Artisanat / fabrication</option>
            <option value="coaching" ${p.businessModel==='coaching'?'selected':''}>Coaching / formation</option>
            <option value="contenu" ${p.businessModel==='contenu'?'selected':''}>Création de contenu / médias</option>
            <option value="agence" ${p.businessModel==='agence'?'selected':''}>Agence (créa, dev, marketing…)</option>
            <option value="marketplace" ${p.businessModel==='marketplace'?'selected':''}>Marketplace / mise en relation</option>
            <option value="liberale" ${p.businessModel==='liberale'?'selected':''}>Profession libérale</option>
            <option value="freelance" ${p.businessModel==='freelance'?'selected':''}>Freelance / indépendant</option>
          </select>
        </div>
        <div><label>Langue de génération</label>
          <select name="language">
            <option value="fr" ${(!p.language||p.language==='fr')?'selected':''}>Français</option>
            <option value="en" ${p.language==='en'?'selected':''}>English</option>
            <option value="es" ${p.language==='es'?'selected':''}>Español</option>
            <option value="de" ${p.language==='de'?'selected':''}>Deutsch</option>
            <option value="it" ${p.language==='it'?'selected':''}>Italiano</option>
            <option value="pt" ${p.language==='pt'?'selected':''}>Português</option>
            <option value="nl" ${p.language==='nl'?'selected':''}>Nederlands</option>
          </select>
        </div>
        <div><label>Devise</label>
          <select name="currency">
            <option value="EUR" ${(!p.currency||p.currency==='EUR')?'selected':''}>€ EUR</option>
            <option value="USD" ${p.currency==='USD'?'selected':''}>$ USD</option>
            <option value="GBP" ${p.currency==='GBP'?'selected':''}>£ GBP</option>
            <option value="CHF" ${p.currency==='CHF'?'selected':''}>CHF</option>
            <option value="CAD" ${p.currency==='CAD'?'selected':''}>$ CAD</option>
            <option value="MAD" ${p.currency==='MAD'?'selected':''}>MAD</option>
            <option value="XOF" ${p.currency==='XOF'?'selected':''}>FCFA (XOF)</option>
            <option value="XAF" ${p.currency==='XAF'?'selected':''}>FCFA (XAF)</option>
          </select>
        </div>
        <div class="full"><label>Description</label><textarea name="description" rows="3">${esc(p.description)}</textarea></div>
        <div class="full"><label>Audience cible</label><input type="text" name="audience" value="${esc(p.audience)}" /></div>
        <div class="full"><label>Valeurs / positionnement</label><input type="text" name="values" value="${esc(p.values)}" placeholder="Ce qui vous différencie en 1 phrase" /></div>
        <div><label>Ton éditorial</label><input type="text" name="tone" value="${esc(p.tone)}" placeholder="professionnel et chaleureux" /></div>

        <h3 class="profile-section-title">Logo</h3>
        <div class="full">
          <input type="hidden" name="logoPath" id="profile-logo-path" value="${esc(p.logoPath)}" />
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div id="profile-logo-preview" style="width:64px;height:64px;border-radius:8px;border:1px solid var(--border);background:var(--bg-2);background-size:cover;background-position:center;${p.logoPath ? `background-image:url('file://${esc(p.logoPath)}')` : ''}"></div>
            <button type="button" class="btn btn-sm" id="profile-logo-pick">Choisir un logo…</button>
            <button type="button" class="btn btn-sm btn-danger" id="profile-logo-clear" ${p.logoPath ? '' : 'style="display:none"'}>Retirer</button>
            <span class="muted" id="profile-logo-name" style="font-size:12px">${p.logoPath ? p.logoPath.split('/').pop() : 'Aucun logo'}</span>
          </div>
        </div>

        <h3 class="profile-section-title">Coordonnées</h3>
        <div><label>Pays</label><input type="text" name="country" value="${esc(p.country)}" /></div>
        <div><label>Site web</label><input type="url" name="website" value="${esc(p.website)}" /></div>
        <div><label>Email de contact</label><input type="email" name="emailContact" value="${esc(p.emailContact)}" /></div>
        <div><label>Téléphone</label><input type="tel" name="phone" value="${esc(p.phone)}" /></div>
        <div class="full"><label>Adresse postale</label><textarea name="address" rows="2">${esc(p.address)}</textarea></div>

        <h3 class="profile-section-title">Mentions légales (factures / contrats)</h3>
        <div><label>SIRET</label><input type="text" name="siret" value="${esc(p.siret)}" /></div>
        <div><label>N° TVA intracommunautaire</label><input type="text" name="vatNumber" value="${esc(p.vatNumber)}" placeholder="FR12345678901" /></div>

        <h3 class="profile-section-title">Coordonnées bancaires (factures)</h3>
        <div><label>IBAN</label><input type="text" name="iban" value="${esc(p.iban)}" /></div>
        <div><label>BIC</label><input type="text" name="bic" value="${esc(p.bic)}" /></div>
        <div class="full"><label>Banque</label><input type="text" name="bankName" value="${esc(p.bankName)}" /></div>

        <h3 class="profile-section-title">Signature email</h3>
        <div class="full"><label>Signature (utilisée dans les emails générés)</label><textarea name="emailSignature" rows="4" placeholder="Marie Dupont&#10;Fondatrice — Acme&#10;marie@acme.com">${esc(p.emailSignature)}</textarea></div>

        <h3 class="profile-section-title">Dossier de travail (vue projet)</h3>
        <div class="full">
          <input type="hidden" name="workspacePath" id="profile-workspace-path" value="${esc(p.workspacePath)}" />
          <p class="muted" style="font-size:12px;margin-bottom:8px">Choisis un dossier (sur ton Mac, iCloud, Dropbox local…) qui regroupe les fichiers du projet. L'app l'indexera pour donner une vue globale et enrichir les prompts du LLM avec le contexte de tes documents existants.</p>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
            <button type="button" class="btn btn-sm" id="profile-workspace-pick">📁 Choisir un dossier…</button>
            <button type="button" class="btn btn-sm btn-danger" id="profile-workspace-clear" ${p.workspacePath ? '' : 'style="display:none"'}>Retirer</button>
            <button type="button" class="btn btn-sm" id="profile-workspace-rescan" ${p.workspacePath ? '' : 'style="display:none"'}>🔄 Rescanner</button>
            <span class="muted" id="profile-workspace-name" style="font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.workspacePath || 'Aucun dossier sélectionné'}</span>
          </div>
          <div id="profile-workspace-summary" class="workspace-summary"></div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Sauvegarder le profil</button>
        </div>
      </form>`;

    document.getElementById('profile-logo-pick').addEventListener('click', async () => {
      try {
        const r = await window.eos.pickLogo();
        if (!r || r.canceled) return;
        document.getElementById('profile-logo-path').value = r.filePath;
        document.getElementById('profile-logo-preview').style.backgroundImage = `url('file://${r.filePath}')`;
        document.getElementById('profile-logo-name').textContent = r.filePath.split('/').pop();
        document.getElementById('profile-logo-clear').style.display = '';
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });
    document.getElementById('profile-logo-clear').addEventListener('click', () => {
      document.getElementById('profile-logo-path').value = '';
      document.getElementById('profile-logo-preview').style.backgroundImage = '';
      document.getElementById('profile-logo-name').textContent = 'Aucun logo';
      document.getElementById('profile-logo-clear').style.display = 'none';
    });

    // ---- Workspace picker ----
    const wsPathInput = document.getElementById('profile-workspace-path');
    const wsName      = document.getElementById('profile-workspace-name');
    const wsClear     = document.getElementById('profile-workspace-clear');
    const wsRescan    = document.getElementById('profile-workspace-rescan');
    const wsSummary   = document.getElementById('profile-workspace-summary');

    const renderWorkspaceSummary = async (folderPath) => {
      if (!folderPath) { wsSummary.innerHTML = ''; return; }
      wsSummary.innerHTML = '<div class="muted" style="font-size:12px">⏳ Indexation en cours…</div>';
      try {
        const r = await window.eos.scanWorkspace(folderPath);
        if (!r.ok) {
          wsSummary.innerHTML = `<div class="muted" style="color:var(--red)">${r.error}</div>`;
          return;
        }
        const s = r.summary;
        const formatSize = (n) => {
          const u = ['B','KB','MB','GB','TB']; let i = 0;
          while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
          return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
        };
        const typeLabels = { document:'Documents', spreadsheet:'Tableurs', presentation:'Présentations', text:'Notes', image:'Images', video:'Vidéos', audio:'Audio', archive:'Archives', code:'Code', design:'Design', autre:'Autres' };
        const tagLabels = { contrat:'📄 Contrats', facture:'🧾 Factures', juridique:'⚖️ Juridique', finance:'💰 Finance', marketing:'📢 Marketing', client:'👤 Client', livrable:'📦 Livrables' };

        wsSummary.innerHTML = `
          <div class="ws-summary-grid">
            <div class="ws-stat"><div class="ws-num">${s.totalFiles}</div><div class="ws-lab">fichiers</div></div>
            <div class="ws-stat"><div class="ws-num">${formatSize(s.totalSize)}</div><div class="ws-lab">volume</div></div>
            <div class="ws-stat"><div class="ws-num">${s.topDirs.length}</div><div class="ws-lab">sous-dossiers</div></div>
            <div class="ws-stat"><div class="ws-num">${Object.keys(s.byTag).length}</div><div class="ws-lab">catégories détectées</div></div>
          </div>
          ${s.truncated ? '<div class="muted" style="font-size:11px;margin-top:6px;color:var(--yellow)">⚠ Plus de 5000 fichiers — scan tronqué</div>' : ''}
          <div class="ws-block">
            <h4>Par type</h4>
            <div class="ws-pills">${Object.entries(s.byType).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<span class="ws-pill"><strong>${n}</strong> ${typeLabels[t]||t}</span>`).join('')}</div>
          </div>
          ${Object.keys(s.byTag).length ? `<div class="ws-block">
            <h4>Catégories métiers détectées</h4>
            <div class="ws-pills">${Object.entries(s.byTag).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<span class="ws-pill"><strong>${n}</strong> ${tagLabels[t]||t}</span>`).join('')}</div>
          </div>` : ''}
          ${s.topDirs.length ? `<div class="ws-block">
            <h4>Sous-dossiers principaux</h4>
            <div class="ws-pills">${s.topDirs.map(d=>`<span class="ws-pill"><strong>${d.count}</strong> ${d.name}</span>`).join('')}</div>
          </div>` : ''}
          ${s.recent.length ? `<div class="ws-block">
            <h4>Fichiers récents</h4>
            <ul class="ws-recent">${s.recent.slice(0,8).map(f=>`<li><span class="ws-rec-name">${f.name}</span><span class="ws-rec-meta muted">${f.relPath} · ${new Date(f.mtime).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</span></li>`).join('')}</ul>
          </div>` : ''}
        `;
      } catch (e) {
        wsSummary.innerHTML = `<div class="muted" style="color:var(--red)">${e.message}</div>`;
      }
    };

    document.getElementById('profile-workspace-pick').addEventListener('click', async () => {
      try {
        const r = await window.eos.pickFolder({ title: 'Choisir le dossier de projet' });
        if (!r || r.canceled) return;
        wsPathInput.value = r.folderPath;
        wsName.textContent = r.folderPath;
        wsClear.style.display = '';
        wsRescan.style.display = '';
        await renderWorkspaceSummary(r.folderPath);
      } catch (e) { window.Dashboard.toast(e.message, 'error'); }
    });
    wsClear.addEventListener('click', () => {
      wsPathInput.value = '';
      wsName.textContent = 'Aucun dossier sélectionné';
      wsClear.style.display = 'none';
      wsRescan.style.display = 'none';
      wsSummary.innerHTML = '';
    });
    wsRescan.addEventListener('click', async () => {
      // force=true pour invalider le cache
      const r = await window.eos.scanWorkspace(wsPathInput.value, true);
      if (r.ok) renderWorkspaceSummary(wsPathInput.value);
    });
    if (p.workspacePath) renderWorkspaceSummary(p.workspacePath);

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {};
      for (const [k, v] of fd.entries()) data[k] = v;
      try {
        await window.eos.saveProfile(data);
        window.Dashboard.toast('Profil sauvegardé', 'success');
      } catch (err) { window.Dashboard.toast(err.message, 'error'); }
    });
  }

  return { render };
})();
