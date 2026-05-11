// src/renderer/app.js — Bootstrap, router, sidebar, badge connexion, thème, palette de commandes
window.App = (() => {
  let currentRoute = 'dashboard';

  function $(id) { return document.getElementById(id); }

  function buildSidebar() {
    const nav = $('sidebar-nav');
    const modules = window.Dashboard.getModules();
    nav.innerHTML = `
      <button class="sb-item ${currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard">
        <span class="sb-ico">⌂</span><span>Dashboard</span>
      </button>
      <div style="height:10px"></div>
      ${modules.map((m) => `
        <button class="sb-item ${currentRoute === 'module/' + m.id ? 'active' : ''}" data-route="module/${m.id}">
          <span class="sb-ico">${m.icon}</span><span>${m.name}</span>
        </button>`).join('')}`;
    nav.querySelectorAll('.sb-item').forEach((b) => {
      b.addEventListener('click', () => navigate(b.dataset.route));
    });
    document.querySelectorAll('.sidebar-footer .sb-item').forEach((b) => {
      b.addEventListener('click', () => navigate(b.dataset.route));
    });
  }

  async function navigate(route) {
    currentRoute = route;
    buildSidebar();
    const target = $('content');
    target.innerHTML = '';
    if (route === 'dashboard') return window.Dashboard.renderDashboard(target);
    if (route === 'settings')  return window.Settings.render(target);
    if (route.startsWith('module/')) {
      const parts = route.split('/');
      return window.Dashboard.renderModule(target, parts[1], parts[2]);
    }
    target.innerHTML = '<div class="card">Page introuvable.</div>';
  }

  async function refreshUsageBadge() {
    try {
      const u = await window.eos.getUsage();
      const total = u.totals?.costUSD || 0;
      const today = new Date().toISOString().split('T')[0];
      const todayCost = (u.byDay && u.byDay[today]?.costUSD) || 0;
      const fmt = (n) => '$' + (n < 0.01 ? n.toFixed(4) : (n < 1 ? n.toFixed(3) : n.toFixed(2)));
      const el = $('usage-badge');
      if (el) {
        el.textContent = todayCost > 0 ? fmt(todayCost) : fmt(total);
        el.title = `Aujourd'hui : ${fmt(todayCost)} · Total : ${fmt(total)} · ${u.totals?.calls || 0} appels`;
      }
    } catch {}
  }

  // Vérification LÉGÈRE : on contrôle juste que la clé du provider est présente,
  // sans faire d'appel API. Le vrai test se fait au clic dans Settings.
  async function refreshConnectionBadge() {
    const dot = $('conn-dot'); const label = $('conn-label');
    try {
      const cfg = await window.eos.getConnectionConfig();
      const modeLabel = { api: 'API', webview: 'Web' }[cfg.mode] || cfg.mode;
      const provider = cfg.mode === 'api' ? (cfg.apiProvider || 'anthropic')
                     : cfg.mode === 'webview' ? (cfg.webviewProvider || 'claude')
                     : cfg.mode;

      let ok = true;
      if (cfg.mode === 'api') {
        const KEY_BY_PROVIDER = {
          anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY',
          gemini: 'GEMINI_API_KEY', mistral: 'MISTRAL_API_KEY',
          deepseek: 'DEEPSEEK_API_KEY', groq: 'GROQ_API_KEY'
        };
        const keyName = KEY_BY_PROVIDER[provider] || 'ANTHROPIC_API_KEY';
        const v = await window.eos.keysGet(keyName).catch(() => null);
        ok = Boolean(v);
      }
      // Pour webview : on ne peut pas vérifier sans piloter la BrowserView (lourd) → on suppose OK
      dot.className = ok ? 'conn-dot ok' : 'conn-dot fail';
      label.textContent = ok ? `${modeLabel} · ${provider}` : `${modeLabel} · ${provider} · clé manquante`;
    } catch (e) {
      dot.className = 'conn-dot fail';
      label.textContent = 'erreur';
    }
  }

  // ---- Thème ----
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('eos.theme', theme); } catch {}
    const btn = $('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀︎' : '☾';
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }
  function initTheme() {
    let saved = 'dark';
    try { saved = localStorage.getItem('eos.theme') || 'dark'; } catch {}
    applyTheme(saved);
  }

  function applyAppearance() {
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('eos.appearance') || '{}'); } catch {}
    if (cfg.accent) {
      const hexToRgba = (hex, a) => {
        const m = hex.replace('#', '');
        const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
        return `rgba(${parseInt(v.substr(0,2),16)},${parseInt(v.substr(2,2),16)},${parseInt(v.substr(4,2),16)},${a})`;
      };
      document.documentElement.style.setProperty('--accent', cfg.accent);
      document.documentElement.style.setProperty('--accent-dim', hexToRgba(cfg.accent, 0.15));
      document.documentElement.style.setProperty('--accent-glow', hexToRgba(cfg.accent, 0.06));
    }
    if (cfg.appName) {
      document.querySelectorAll('.brand-name, .sb-title').forEach((el) => { el.textContent = cfg.appName; });
      document.title = cfg.appName;
    }
    if (cfg.subtitle) {
      const sub = document.querySelector('.sb-sub');
      if (sub) sub.textContent = cfg.subtitle;
    }
    if (cfg.defaultTheme === 'auto') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(dark ? 'dark' : 'light');
    } else if (cfg.defaultTheme && !localStorage.getItem('eos.theme')) {
      applyTheme(cfg.defaultTheme);
    }
  }

  // ---- Palette de commandes (⌘K) ----
  function openCommandPalette() {
    const existing = document.getElementById('cmd-palette');
    if (existing) { existing.querySelector('input').focus(); return; }

    const modules = window.Dashboard.getModules();
    const items = [
      { type: 'nav', label: 'Aller au Dashboard', shortcut: '⌘0', action: () => navigate('dashboard') },
      { type: 'nav', label: 'Aller aux Paramètres', shortcut: '⌘,', action: () => navigate('settings') },
      { type: 'theme', label: 'Basculer thème clair / sombre', shortcut: '⌘⇧L', action: toggleTheme },
      ...modules.map((m, i) => ({
        type: 'module',
        label: `Ouvrir ${m.name}`,
        icon: m.icon,
        shortcut: i < 9 ? `⌘${i + 1}` : '',
        action: () => navigate('module/' + m.id)
      }))
    ];

    const modal = document.createElement('div');
    modal.id = 'cmd-palette';
    modal.className = 'cmd-palette-backdrop';
    modal.innerHTML = `
      <div class="cmd-palette">
        <input type="text" id="cmd-input" placeholder="Que veux-tu faire ? Tape pour filtrer…" autocomplete="off" spellcheck="false" />
        <div id="cmd-list" class="cmd-list"></div>
        <div class="cmd-footer">
          <span><kbd>↑↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> exécuter</span>
          <span><kbd>esc</kbd> fermer</span>
        </div>
      </div>`;
    document.body.appendChild(modal);

    let filtered = items.slice();
    let selectedIdx = 0;

    const renderList = () => {
      const list = document.getElementById('cmd-list');
      list.innerHTML = filtered.length ? filtered.map((it, i) => `
        <div class="cmd-item ${i === selectedIdx ? 'sel' : ''}" data-idx="${i}">
          <span class="cmd-ico">${it.icon || (it.type === 'nav' ? '↗' : it.type === 'theme' ? '◐' : '·')}</span>
          <span class="cmd-label">${it.label}</span>
          ${it.shortcut ? `<span class="cmd-kbd">${it.shortcut}</span>` : ''}
        </div>`).join('') : '<div class="cmd-empty">Aucune correspondance</div>';
      list.querySelectorAll('.cmd-item').forEach((el) => {
        el.addEventListener('click', () => execute(parseInt(el.dataset.idx, 10)));
        el.addEventListener('mouseenter', () => { selectedIdx = parseInt(el.dataset.idx, 10); renderList(); });
      });
    };

    const execute = (idx) => {
      const it = filtered[idx]; if (!it) return;
      close();
      try { it.action(); } catch (e) { console.error(e); }
    };

    const close = () => modal.remove();

    const input = document.getElementById('cmd-input');
    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      filtered = !q ? items.slice() : items.filter((it) => it.label.toLowerCase().includes(q));
      selectedIdx = 0;
      renderList();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(filtered.length - 1, selectedIdx + 1); renderList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); renderList(); }
      else if (e.key === 'Enter') { e.preventDefault(); execute(selectedIdx); }
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    renderList();
    setTimeout(() => input.focus(), 10);
  }

  // ---- Raccourcis globaux ----
  function bindShortcuts() {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // ⌘K — palette
      if ((e.key === 'k' || e.key === 'K') && !e.shiftKey) {
        e.preventDefault();
        const existing = document.getElementById('cmd-palette');
        if (existing) existing.remove();
        else openCommandPalette();
        return;
      }
      // ⌘0 — dashboard
      if (e.key === '0') { e.preventDefault(); navigate('dashboard'); return; }
      // ⌘, — settings
      if (e.key === ',') { e.preventDefault(); navigate('settings'); return; }
      // ⌘⇧L — toggle theme
      if (e.shiftKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); toggleTheme(); return; }
      // ⌘1..9 — modules 1 à 9
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        const modules = window.Dashboard.getModules();
        if (modules[idx]) { e.preventDefault(); navigate('module/' + modules[idx].id); }
        return;
      }
      // ⌘↵ dans un formulaire de module — submit
      if (e.key === 'Enter') {
        const form = document.getElementById('mod-form-el');
        if (form && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
          e.preventDefault();
          form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  }

  async function start() {
    buildSidebar();
    await navigate('dashboard');
    refreshConnectionBadge();
    refreshUsageBadge();
    // Badge connexion : check léger (pas d'API call), 5 min suffisent
    setInterval(refreshConnectionBadge, 300000);
    // Badge usage : refresh modéré (le coût ne change qu'après une génération de toute façon)
    setInterval(refreshUsageBadge, 30000);

    const tt = $('theme-toggle');
    if (tt) tt.addEventListener('click', toggleTheme);
    const cb = $('cmd-palette-btn');
    if (cb) cb.addEventListener('click', openCommandPalette);
    const ub = $('usage-badge');
    if (ub) ub.addEventListener('click', () => navigate('settings'));
  }

  async function boot() {
    initTheme();
    applyAppearance();
    bindShortcuts();
    if (await window.Onboarding.shouldShow()) {
      window.Onboarding.start();
    } else {
      $('onboarding').classList.add('hidden');
      $('app').classList.remove('hidden');
      start();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { navigate, refreshConnectionBadge, start, openCommandPalette, toggleTheme };
})();
