// ui-settings.js — Paramètres : provider IA, clé API, modèle, coûts, streaming

import { Storage } from './storage.js';
import { PROVIDERS, getModelInfo, estimateCost, TIER_LABELS, testApiConnection } from './ai-client.js';
import { escapeHtml, formatTokens, formatCost, formatCostDetailed, USD_TO_EUR } from './format.js';
import { t, getLocale, setLocale } from './i18n.js';

let _onBack = null;

const TOKENS_PER_TURN = { in: 1050, out: 550 };

export function renderSettings(container, callbacks) {
  _onBack = callbacks.onBack;
  refresh(container);
}

function modelBadges(m) {
  const badges = [];
  if (m.recommended) badges.push('<span class="model-badge badge-reco">★ recommandé</span>');
  if (m.free) badges.push('<span class="model-badge badge-free">🎁 gratuit</span>');
  if (m.fast) badges.push('<span class="model-badge badge-fast">⚡ rapide</span>');
  return badges.join(' ');
}

function tierBadge(tier) {
  const map = {
    cheap: { label: '💰 ÉCONOMIQUE', cls: 'tier-cheap' },
    mid:   { label: '⚖ ÉQUILIBRÉ',   cls: 'tier-mid' },
    premium:{ label: '👑 PREMIUM',   cls: 'tier-premium' }
  };
  const tb = map[tier];
  if (!tb) return '';
  return `<span class="tier-badge ${tb.cls}">${tb.label}</span>`;
}

function refresh(container) {
  const settings = Storage.getSettings();
  const provider = PROVIDERS[settings.provider] || PROVIDERS.freemium || PROVIDERS.openrouter;
  const isBundled = !!provider.bundled;

  container.innerHTML = `
    <div class="settings-screen">
      <header class="panel-header">
        <button class="back-btn" id="settings-back">← Retour</button>
        <h2 class="royal-title">⚙ PARAMÈTRES</h2>
      </header>

      <div class="settings-body">
        <section class="setting-section">
          <h3 class="section-title">FOURNISSEUR IA</h3>
          <div class="provider-grid">
            ${Object.entries(PROVIDERS).map(([key, p]) => `
              <button class="provider-btn ${key === settings.provider ? 'selected' : ''}" data-provider="${key}">
                <div class="provider-name">${escapeHtml(p.label)}</div>
                <div class="provider-desc">${escapeHtml(p.description)}</div>
              </button>
            `).join('')}
          </div>
          ${isBundled ? '' : `
          <a class="docs-link" href="${escapeHtml(provider.docsUrl)}" target="_blank" rel="noopener">
            🔑 Obtenir une clé API ${escapeHtml(provider.label)}
          </a>`}
        </section>

        ${isBundled ? `
        <section class="setting-section">
          <div class="freemium-banner">
            ✓ Aucune configuration nécessaire — 100 messages/jour offerts.
            <div class="muted small">Pour un usage illimité, choisis un autre fournisseur et ajoute ta clé API.</div>
          </div>
          <div class="api-key-actions">
            <button class="link-btn" id="test-api-btn">🧪 Tester la connexion</button>
            <span id="test-api-result" class="muted small"></span>
          </div>
        </section>
        ` : `
        <section class="setting-section">
          <h3 class="section-title">CLÉ API</h3>
          <div class="api-key-row">
            <input type="password" id="api-key-input" placeholder="sk-…" value="${escapeHtml(settings.apiKey || '')}" />
            <button class="icon-btn" id="toggle-key-btn" title="Afficher/masquer">👁</button>
          </div>
          <div class="api-key-actions">
            <button class="link-btn" id="test-api-btn">🧪 Tester la connexion</button>
            <span id="test-api-result" class="muted small"></span>
          </div>
          <p class="muted small">Stockée localement uniquement (localStorage). Jamais envoyée ailleurs qu'au fournisseur choisi.</p>
        </section>
        `}

        <section class="setting-section">
          <h3 class="section-title">MODÈLE — 3 tiers rapides</h3>
          <p class="muted small">Tous ces modèles sont rapides. Choisis selon ton budget et tes attentes de qualité narrative.</p>
          <div class="model-list" id="model-list">
            ${(provider.models || []).map((m) => `
              <button class="model-card model-tier-${m.tier || 'cheap'} ${m.id === settings.model ? 'selected' : ''}" data-model="${escapeHtml(m.id)}">
                <div class="model-card-header">
                  ${tierBadge(m.tier)}
                  <span class="model-badges">${modelBadges(m)}</span>
                </div>
                <div class="model-name">${escapeHtml(m.label)}</div>
                <div class="model-price">
                  ${m.priceIn === 0 && m.priceOut === 0
                    ? '<span class="price-free">Totalement gratuit</span>'
                    : `Entrée : ${m.priceIn}$/M · Sortie : ${m.priceOut}$/M`}
                </div>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="setting-section">
          <h3 class="section-title">STREAMING</h3>
          <div class="toggle-row">
            <div class="toggle-text">
              <div class="toggle-label">Affichage progressif (texte qui apparaît au fur et à mesure)</div>
              <div class="muted small">Recommandé : sensation immédiate, perception de rapidité accrue. Coût identique.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="streaming-toggle" ${settings.useStreaming !== false ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        <section class="setting-section">
          <h3 class="section-title">CONFORT &amp; ACCESSIBILITÉ</h3>
          <div class="toggle-row">
            <div class="toggle-text">
              <div class="toggle-label">🔊 Audio (sons synthétiques)</div>
              <div class="muted small">Court clic à chaque décision, fanfare aux achievements, descente grave en fin de règne. Aucun fichier audio externe.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="audio-toggle" ${settings.audioEnabled === true ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-text">
              <div class="toggle-label">📖 Mode lecture (texte agrandi)</div>
              <div class="muted small">Augmente la taille de la narration et de l'épitaphe à 19px.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="reading-toggle" ${settings.readingMode === true ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-text">
              <div class="toggle-label">🌗 Contraste élevé</div>
              <div class="muted small">Palette claire (fond beige, texte sombre) pour une meilleure lisibilité.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="contrast-toggle" ${settings.highContrast === true ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-text">
              <div class="toggle-label">🌐 Langue / Language</div>
              <div class="muted small">${escapeHtml(t('settings_language_desc'))}</div>
            </div>
            <div class="lang-toggle">
              <button class="lang-btn ${getLocale() === 'fr' ? 'active' : ''}" data-lang="fr">FR</button>
              <button class="lang-btn ${getLocale() === 'en' ? 'active' : ''}" data-lang="en">EN</button>
            </div>
          </div>
        </section>

        <section class="setting-section">
          <h3 class="section-title">COÛT ESTIMÉ PAR PARTIE</h3>
          <div class="cost-table" id="cost-table">
            ${renderCostTable(settings)}
          </div>
        </section>

        <section class="setting-section">
          <h3 class="section-title">CONSOMMATION TOTALE</h3>
          <div class="usage-stats">
            <div class="usage-row">
              <span>Tokens utilisés (cumulés)</span>
              <strong>${formatTokens(settings.totalTokensUsed || 0)}</strong>
            </div>
            <div class="usage-row big-cost">
              <span>Coût total estimé</span>
              <strong class="cost-eur">${formatCost(settings.totalCostUsd || 0)}</strong>
            </div>
            <div class="usage-row sub">
              <span class="muted small">Équivalent en dollars (avant conversion)</span>
              <span class="muted small">$${(settings.totalCostUsd || 0).toFixed(4)}</span>
            </div>
            <div class="usage-row sub">
              <span class="muted small">Taux appliqué</span>
              <span class="muted small">1 $ = ${USD_TO_EUR} €</span>
            </div>
          </div>
        </section>

        <section class="setting-section">
          <button class="link-btn" id="replay-onboarding-btn">📖 Revoir le tutoriel</button>
        </section>

        <section class="setting-section">
          <button class="primary-btn big-btn" id="save-settings-btn">💾 ENREGISTRER</button>
        </section>

        <section class="setting-section danger-zone">
          <h3 class="section-title danger">⚠ ZONE DANGEREUSE</h3>
          <p class="muted small">Ces actions sont irréversibles.</p>

          <button class="danger-btn" id="reset-counters-btn">
            <div class="danger-btn-title">↺ Réinitialiser les compteurs de tokens</div>
            <div class="danger-btn-desc">Remet à zéro l'usage cumulé. Aucune partie n'est touchée.</div>
          </button>

          <button class="danger-btn" id="reset-history-btn">
            <div class="danger-btn-title">🗑 Effacer toutes les parties archivées</div>
            <div class="danger-btn-desc">Supprime l'historique des règnes terminés. Les paramètres et achievements sont conservés.</div>
          </button>

          <button class="danger-btn danger-strong" id="reset-all-btn">
            <div class="danger-btn-title">💀 RECOMMENCER À ZÉRO (tout effacer)</div>
            <div class="danger-btn-desc">Efface TOUT : paramètres, clé API, achievements, records, parties archivées. L'app revient à l'état initial.</div>
          </button>
        </section>
      </div>
    </div>
  `;

  container.querySelector('#settings-back').addEventListener('click', () => _onBack && _onBack());

  container.querySelectorAll('.provider-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const newProvider = b.dataset.provider;
      const defaultModel = PROVIDERS[newProvider]?.models[0]?.id;
      Storage.saveSettings({ provider: newProvider, model: defaultModel });
      refresh(container);
    });
  });

  const keyInput = container.querySelector('#api-key-input');
  container.querySelector('#toggle-key-btn')?.addEventListener('click', () => {
    if (!keyInput) return;
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  // Sélection modèle (clic sur card)
  let chosenModel = settings.model;
  container.querySelectorAll('.model-card').forEach((card) => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.model-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      chosenModel = card.dataset.model;
      const ns = { ...settings, model: chosenModel };
      container.querySelector('#cost-table').innerHTML = renderCostTable(ns);
    });
  });

  container.querySelector('#streaming-toggle').addEventListener('change', (ev) => {
    Storage.saveSettings({ useStreaming: ev.target.checked });
  });

  // Audio toggle (Phase 6.4)
  container.querySelector('#audio-toggle')?.addEventListener('change', async (ev) => {
    const on = ev.target.checked;
    Storage.saveSettings({ audioEnabled: on });
    try {
      const m = await import('./audio.js');
      m.setAudioEnabled(on);
      if (on) m.playTone('unlock');
    } catch {}
  });

  // Mode lecture (Phase 6.2)
  container.querySelector('#reading-toggle')?.addEventListener('change', (ev) => {
    Storage.saveSettings({ readingMode: ev.target.checked });
    document.body.classList.toggle('regne-reading-mode', ev.target.checked);
  });

  // Contraste élevé (Phase 6.2)
  container.querySelector('#contrast-toggle')?.addEventListener('change', (ev) => {
    Storage.saveSettings({ highContrast: ev.target.checked });
    document.body.classList.toggle('regne-high-contrast', ev.target.checked);
  });

  // Bouton "Revoir le tutoriel"
  container.querySelector('#replay-onboarding-btn')?.addEventListener('click', async () => {
    const m = await import('./ui-onboarding.js');
    await m.showOnboarding();
  });

  // Toggle langue FR/EN (i18n)
  container.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (setLocale(lang)) {
        // Re-render le panel settings + l'app entière (via navigate vers settings de nouveau)
        document.dispatchEvent(new CustomEvent('regne:locale-change', { detail: { locale: lang } }));
        // Force le re-render de la vue courante
        refresh(container);
      }
    });
  });

  container.querySelector('#save-settings-btn').addEventListener('click', () => {
    const patch = {
      model: chosenModel,
      useStreaming: container.querySelector('#streaming-toggle').checked
    };
    if (keyInput) patch.apiKey = keyInput.value.trim();
    Storage.saveSettings(patch);
    showToast(container, '✅ Paramètres sauvegardés');
  });

  container.querySelector('#reset-counters-btn').addEventListener('click', async () => {
    const { confirmDialog } = await import('./ui-toast.js');
    if (!(await confirmDialog('Réinitialiser les compteurs de tokens ?', { okLabel: 'Réinitialiser' }))) return;
    Storage.saveSettings({ totalTokensUsed: 0, totalCostUsd: 0 });
    refresh(container);
  });

  container.querySelector('#reset-history-btn').addEventListener('click', async () => {
    const { confirmDialog, toastError } = await import('./ui-toast.js');
    if (!(await confirmDialog('Effacer définitivement toutes les parties archivées ?', { okLabel: 'Effacer' }))) return;
    try {
      await Storage.clearHistory();
      showToast(container, '✅ Historique effacé');
    } catch (err) {
      toastError('Erreur : ' + (err.message || err));
    }
  });

  container.querySelector('#reset-all-btn').addEventListener('click', async () => {
    const { confirmDialog, toastError } = await import('./ui-toast.js');
    if (!(await confirmDialog('⚠ TOUT EFFACER ? Paramètres, clé API, parties archivées, achievements — tout sera supprimé.', { okLabel: 'Effacer tout' }))) return;
    if (!(await confirmDialog('Dernière confirmation : recommencer vraiment à zéro ?', { okLabel: 'Oui, tout effacer' }))) return;
    try {
      await Storage.clearAll();
      showToast(container, '✅ Tout est effacé. Recharge…');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      toastError('Erreur : ' + (err.message || err));
    }
  });

  // Test de la clé API
  const testBtn = container.querySelector('#test-api-btn');
  const testResult = container.querySelector('#test-api-result');
  testBtn.addEventListener('click', async () => {
    // D'abord enregistrer la clé saisie (si champ visible)
    const patch = { model: chosenModel };
    if (keyInput) patch.apiKey = keyInput.value.trim();
    Storage.saveSettings(patch);
    testBtn.disabled = true;
    testResult.innerHTML = '<span class="spinner"></span> Test…';
    const start = Date.now();
    const r = await testApiConnection();
    const ms = Date.now() - start;
    testBtn.disabled = false;
    if (r.ok) {
      testResult.innerHTML = `<span style="color: var(--success-vert);">✅ Connexion OK (${ms} ms)</span>`;
    } else {
      testResult.innerHTML = `<span style="color: var(--danger-red);">❌ ${escapeHtml(r.error || 'Erreur inconnue')}</span>`;
    }
  });
}

function renderCostTable(settings) {
  const provider = settings.provider;
  const model = settings.model;
  const m = getModelInfo(provider, model);
  if (!m) return '<p class="muted">Modèle inconnu</p>';

  const scenarios = [
    { label: 'Partie courte', turns: 10 },
    { label: 'Partie moyenne', turns: 30 },
    { label: 'Partie longue', turns: 60 }
  ];

  const isFree = m.priceIn === 0 && m.priceOut === 0;

  const rows = scenarios.map((s) => {
    const totalIn = s.turns * TOKENS_PER_TURN.in;
    const totalOut = s.turns * TOKENS_PER_TURN.out;
    const cost = estimateCost(provider, model, totalIn, totalOut);
    return `
      <div class="cost-row">
        <span class="cost-scenario">${s.label} (${s.turns} tours)</span>
        <span class="cost-tokens">~ ${formatTokens(totalIn + totalOut)}</span>
        <span class="cost-price">${isFree ? '🎁 Gratuit' : formatCost(cost)}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="cost-header muted small">Modèle actuel : <strong>${escapeHtml(m.label)}</strong> · prix convertis en € (taux 1$ = ${USD_TO_EUR}€)</div>
    ${rows}
  `;
}

function showToast(container, msg) {
  let toast = container.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    container.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2200);
}
