// ui-setup.js — Création d'une nouvelle partie : genre + reprise

import { Storage } from './storage.js';
import { hasAI } from './ai-client.js';
import { generateRandomNation, pickFallbackNation, GENRES, QUICK_SCENARIOS, HOME_TIPS, generateProphecies } from './ai-narrator.js';
import { GAUGE_KEYS, GAUGES, DIFFICULTY_MODIFIERS, getStartingGauges, getStartingYear, PLAYER_TRAITS, defaultTraits, generateAdvisors, ACHIEVEMENTS, RELICS, getRelicById, applyRelicEffects, MAX_ACTIVE_RELICS, generateNeighbors, defaultMarket, defaultTech } from './game-engine.js';
import { escapeHtml, formatEra, formatTurn, formatScore, formatRelativeTime, formatEndingType, uuid } from './format.js';
import { t } from './i18n.js';

const ERAS = [
  { value: 'antiquite_rome', label: 'Antiquité — Rome' },
  { value: 'antiquite_grece', label: 'Antiquité — Grèce' },
  { value: 'antiquite_egypte', label: 'Antiquité — Égypte' },
  { value: 'antiquite_perse', label: 'Antiquité — Perse' },
  { value: 'moyen_age_eu', label: 'Moyen-Âge européen' },
  { value: 'moyen_age_asie', label: 'Moyen-Âge asiatique' },
  { value: 'moyen_age_orient', label: 'Moyen-Âge proche-oriental' },
  { value: 'renaissance', label: 'Renaissance (XVe-XVIe s.)' },
  { value: 'moderne', label: 'Époque moderne (XVIIe-XIXe s.)' },
  { value: 'xx_siecle', label: 'XXe siècle' },
  { value: 'contemporain', label: 'Contemporain (2000-2030)' },
  { value: 'futur_proche', label: 'Futur proche (2030-2100)' },
  { value: 'futur_lointain', label: 'Futur lointain (2100+)' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'scifi', label: 'Sci-fi (space opera)' },
  { value: 'post_apo', label: 'Post-apocalyptique' },
  { value: 'uchronie', label: 'Uchronie' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'autre', label: 'Autre (texte libre)' }
];

const FLAG_GRID = ['👑', '⚔', '🏰', '🛡', '⚜', '🦅', '🐉', '🦁', '🐺', '🐻', '🦊', '🦌', '🐎', '🌹', '🌿', '⚓', '🏔', '🌋', '🌊', '☀', '🌙', '⭐', '🔥', '⚡', '🗝', '📜', '⚖', '🏛', '🌍', '🤖'];

const TITLES = ['Roi', 'Reine', 'Empereur', 'Imperatrice', 'Sultan', 'Sultane', 'Pharaon', 'Pharaonne', 'Président(e)', 'Premier(ère) Ministre', 'Chef d\'État', 'Doge', 'Tsar', 'Tsarine', 'Khan', 'Coordinateur(trice)', 'Grand(e) Chieftain(e)', 'Consul', 'Tribun', 'Régent(e)'];

let _onStartCallback = null;
let _selectedFlag = '👑';
let _selectedGenre = 'random';
let _isGenerating = false;
let _generatedNation = null;
let _generatedGenre = 'random';
let _traits = defaultTraits();
let _isNewGamePlus = false;
let _continueLineage = false;
let _selectedMode = null; // classic | heritage | chronicle

export async function renderSetup(container, onStart) {
  _onStartCallback = onStart;
  _generatedNation = null;
  _selectedFlag = '👑';
  _selectedGenre = 'random';
  _traits = defaultTraits();

  // Détection NewGame+
  _isNewGamePlus = false;
  try {
    if (sessionStorage.getItem('regne_newgame_plus') === '1') {
      _isNewGamePlus = true;
      sessionStorage.removeItem('regne_newgame_plus');
    }
  } catch (err) { console.warn('[setup] sessionStorage indisponible:', err); }

  const current = Storage.getCurrentGame();
  const records = Storage.getRecords();
  const settings = Storage.getSettings();
  const hasApiKey = hasAI(settings);

  // Récents règnes (async — IndexedDB)
  let recentReigns = [];
  try { recentReigns = await Storage.getGameHistory(3); } catch (err) { console.warn('[setup] getGameHistory failed:', err); }

  // Tip rotatif
  const tip = HOME_TIPS[Math.floor(Math.random() * HOME_TIPS.length)];

  container.innerHTML = `
    <div class="setup-screen rich-home">
      <header class="setup-header">
        <img class="home-logo" src="logo.png" alt="World State Simulator" width="72" height="72">
        <h1 class="royal-title">${escapeHtml(t('app_title'))}</h1>
        <p class="subtitle">${escapeHtml(t('app_subtitle'))}</p>
        ${_isNewGamePlus ? '<div class="newgame-plus-badge">⚡ NEWGAME+ ACTIVÉ : +5 par jauge de départ</div>' : ''}
      </header>

      ${!hasApiKey ? renderApiKeyAlert() : ''}
      ${renderHeroStats(records, settings)}
      ${current && !current.ended ? renderResumeBanner(current) : ''}

      <!-- ========== SECTION 1 : COMMENCER VITE ========== -->
      <section class="home-section">
        <div class="home-section-header">
          <h2 class="home-section-title">${escapeHtml(t('home_quickstart'))}</h2>
          <span class="home-section-sub">${escapeHtml(t('home_quickstart_sub'))}</span>
        </div>
        <div class="quick-scenarios-grid">
          ${QUICK_SCENARIOS.map((s) => `
            <button class="quick-scenario-card ${s.historical ? 'is-historical' : ''}" data-scenario="${s.id}" style="--scen-accent:${s.accent}">
              ${s.historical ? '<span class="qs-badge-hist">📜 Historique</span>' : ''}
              <div class="qs-flag">${s.flag}</div>
              <div class="qs-title">${escapeHtml(s.title)}</div>
              <div class="qs-desc">${escapeHtml(s.description)}</div>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- ========== SECTION 2 : MODES PERSONNALISÉS ========== -->
      <section class="home-section">
        <div class="home-section-header">
          <h2 class="home-section-title">${escapeHtml(t('home_custom'))}</h2>
          <span class="home-section-sub">${escapeHtml(t('home_custom_sub'))}</span>
        </div>
        <div class="setup-modes">
          <button class="mode-card mode-ai" id="mode-genre-btn">
            <div class="mode-icon">🌍</div>
            <div class="mode-title">${escapeHtml(t('home_choose_genre'))}</div>
            <div class="mode-desc">${escapeHtml(t('home_choose_genre_desc'))}</div>
          </button>

          <button class="mode-card mode-custom" id="mode-custom-btn">
            <div class="mode-icon">✍</div>
            <div class="mode-title">${escapeHtml(t('home_configure'))}</div>
            <div class="mode-desc">${escapeHtml(t('home_configure_desc'))}</div>
          </button>
        </div>
      </section>

      <div id="setup-detail" class="setup-detail"></div>

      <!-- ========== MODES DE JEU (Phase 3) ========== -->
      ${renderGameModesSection()}

      <!-- ========== RELIQUES (méta-progression) ========== -->
      ${renderRelicsSection()}

      <!-- ========== SECTION 3 : GALERIE DES RÈGNES ========== -->
      ${recentReigns.length > 0 ? renderRecentReignsSection(recentReigns) : ''}

      <!-- ========== SECTION 4 : ACHIEVEMENTS ========== -->
      ${renderAchievementsSection(records)}

      <!-- ========== SECTION 5 : SAVIEZ-VOUS ========== -->
      <section class="home-section tip-section">
        <div class="tip-card">
          <div class="tip-icon">${tip.icon}</div>
          <div class="tip-content">
            <div class="tip-label">SAVIEZ-VOUS QUE ?</div>
            <div class="tip-text">${escapeHtml(tip.text)}</div>
          </div>
          <button class="link-btn tip-next" id="tip-next-btn" title="Astuce suivante">↻</button>
        </div>
      </section>

      <!-- ========== SECTION 6 : FEATURES ========== -->
      <section class="home-section">
        <div class="home-section-header">
          <h2 class="home-section-title">🎨 CE QUE TU PEUX FAIRE</h2>
          <span class="home-section-sub">Toutes les fonctionnalités du jeu</span>
        </div>
        <div class="features-grid">
          <div class="feature-pill"><span>🤖</span><span>Multi-IA (5 providers, 15 modèles)</span></div>
          <div class="feature-pill"><span>⚡</span><span>Streaming texte temps réel</span></div>
          <div class="feature-pill"><span>👥</span><span>Conseillers persistants</span></div>
          <div class="feature-pill"><span>✍</span><span>Choix libre évalué par l'IA</span></div>
          <div class="feature-pill"><span>🎭</span><span>Traits de personnalité</span></div>
          <div class="feature-pill"><span>🌪</span><span>Crises mondiales</span></div>
          <div class="feature-pill"><span>📊</span><span>Stats détaillées par règne</span></div>
          <div class="feature-pill"><span>🔓</span><span>18 achievements (8 secrets)</span></div>
          <div class="feature-pill"><span>⚡</span><span>NewGame+ avec bonus</span></div>
          <div class="feature-pill"><span>🔗</span><span>Partage de règne par URL</span></div>
          <div class="feature-pill"><span>🎁</span><span>Mode totalement gratuit</span></div>
          <div class="feature-pill"><span>📜</span><span>Archives illimitées</span></div>
        </div>
      </section>

      <footer class="setup-footer">
        <button class="link-btn" id="setup-profile-btn">${escapeHtml(t('footer_profile'))}</button>
        <button class="link-btn" id="setup-history-btn">${escapeHtml(t('footer_history'))}</button>
        <button class="link-btn" id="setup-settings-btn">${escapeHtml(t('footer_settings'))}</button>
      </footer>
    </div>
  `;

  if (current && !current.ended) {
    container.querySelector('#resume-btn').addEventListener('click', () => {
      _onStartCallback && _onStartCallback(current);
    });
    container.querySelector('#abandon-btn').addEventListener('click', async () => {
      const { confirmDialog } = await import('./ui-toast.js');
      const ok = await confirmDialog(
        `Abandonner le règne en cours sur ${current.country?.name || 'ce pays'} ? Aucun score ne sera attribué.`,
        { okLabel: 'Abandonner' }
      );
      if (ok) {
        Storage.clearCurrentGame();
        renderSetup(container, _onStartCallback);
      }
    });
  }

  container.querySelector('#mode-genre-btn').addEventListener('click', () => renderGenreMode(container));
  container.querySelector('#mode-custom-btn').addEventListener('click', () => renderCustomMode(container));

  // Bind reliques : toggle d'activation (max 2)
  bindRelicsSection(container);
  bindGameModesSection(container);
  container.querySelector('#setup-history-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'history' } }));
  });
  container.querySelector('#setup-settings-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'settings' } }));
  });
  container.querySelector('#setup-profile-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'profile' } }));
  });

  // Bind quick scenarios — démarre la partie en 1 clic
  container.querySelectorAll('.quick-scenario-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scenario;
      const scenario = QUICK_SCENARIOS.find((s) => s.id === id);
      if (!scenario) return;
      const leaderName = prompt(`Quel sera votre nom comme ${scenario.nation.leaderTitle} ?`, '') || 'Souverain·e';
      _generatedGenre = id;
      // Propager l'arc historique éventuel sur la nation passée à startGame
      const nation = { ...scenario.nation };
      if (scenario.historicalArcId) nation.historicalArcId = scenario.historicalArcId;
      startGame(nation, leaderName, 'gouvernant');
    });
  });

  // Bind tip cycler
  const tipBtn = container.querySelector('#tip-next-btn');
  if (tipBtn) {
    tipBtn.addEventListener('click', () => {
      const newTip = HOME_TIPS[Math.floor(Math.random() * HOME_TIPS.length)];
      const card = container.querySelector('.tip-card');
      if (!card) return;
      card.querySelector('.tip-icon').textContent = newTip.icon;
      card.querySelector('.tip-text').textContent = newTip.text;
    });
  }

  // Bind setup-config-btn (alert d'API key manquante)
  const configBtn = container.querySelector('#setup-config-btn');
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('regne:navigate', { detail: { panel: 'settings' } }));
    });
  }
}

// --- Helpers visuels ---

function renderApiKeyAlert() {
  return `
    <div class="api-alert">
      <div class="api-alert-icon">🔑</div>
      <div class="api-alert-body">
        <div class="api-alert-title">Configurer une clé API IA pour commencer</div>
        <div class="muted small">OpenRouter Gemini 2.0 Flash est totalement gratuit. ~30 secondes de configuration.</div>
      </div>
      <button class="primary-btn small" id="setup-config-btn">⚙ CONFIGURER</button>
    </div>
  `;
}

function renderHeroStats(records, settings) {
  const ach = (records.achievements || []).length;
  const totalAch = ACHIEVEMENTS.length;
  return `
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="hero-stat-value">${records.totalGames || 0}</div>
        <div class="hero-stat-label">Règnes</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${formatScore(records.bestScore || 0)}</div>
        <div class="hero-stat-label">Meilleur score</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${ach}/${totalAch}</div>
        <div class="hero-stat-label">Réalisations</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${records.totalTurns || 0}</div>
        <div class="hero-stat-label">Tours joués</div>
      </div>
    </div>
  `;
}

function renderRecentReignsSection(reigns) {
  return `
    <section class="home-section">
      <div class="home-section-header">
        <h2 class="home-section-title">📜 TES DERNIERS RÈGNES</h2>
        <button class="link-btn" id="see-all-archives-btn">Voir tout →</button>
      </div>
      <div class="recent-reigns-grid">
        ${reigns.map((r) => {
          const icon = { legendary: '✨', great: '👑', good: '⚔', neutral: '⚖', bad: '⛓', catastrophic: '💀' }[r.endingType] || '📜';
          return `
            <div class="recent-reign-card ending-${r.endingType || 'neutral'}">
              <div class="rr-flag">${escapeHtml(r.country?.flag || '👑')}</div>
              <div class="rr-name">${escapeHtml(r.country?.name || 'Anonyme')}</div>
              <div class="rr-stats">${icon} ${formatScore(r.finalScore || 0)} pts · ${formatTurn(r.totalTurns || 0)}</div>
              <div class="rr-time">${formatRelativeTime(r.endedAt)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderAchievementsSection(records) {
  const unlocked = new Set(records.achievements || []);
  const total = ACHIEVEMENTS.length;
  const unlockedCount = unlocked.size;
  return `
    <section class="home-section">
      <div class="home-section-header">
        <h2 class="home-section-title">🏆 RÉALISATIONS (${unlockedCount}/${total})</h2>
        <span class="home-section-sub">${total - unlockedCount} encore à débloquer</span>
      </div>
      <div class="achievements-overview-grid">
        ${ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          if (!isUnlocked && a.secret) {
            return `<div class="ach-overview locked secret" title="Achievement secret">
              <div class="ach-ov-icon">?</div>
              <div class="ach-ov-label">SECRET</div>
            </div>`;
          }
          return `<div class="ach-overview ${isUnlocked ? 'unlocked' : 'locked'}" title="${escapeHtml(a.description)}">
            <div class="ach-ov-icon">${a.icon}</div>
            <div class="ach-ov-label">${escapeHtml(a.label)}</div>
          </div>`;
        }).join('')}
      </div>
    </section>
  `;
}

function renderResumeBanner(current) {
  return `
    <div class="resume-banner">
      <div class="resume-info">
        <div class="resume-flag">${escapeHtml(current.country?.flag || '👑')}</div>
        <div>
          <div class="resume-title">Règne en cours</div>
          <div class="resume-meta">${escapeHtml(current.country?.name || '')} · ${formatTurn(current.turn || 1)}</div>
        </div>
      </div>
      <div class="resume-actions">
        <button class="primary-btn small" id="resume-btn">↪ Reprendre</button>
        <button class="link-btn danger" id="abandon-btn">Abandonner</button>
      </div>
    </div>
  `;
}

function renderRecordsCard(records) {
  return `
    <div class="setup-records">
      <div class="setup-records-stat"><strong>${records.totalGames}</strong><span>règnes</span></div>
      <div class="setup-records-stat"><strong>${records.bestScore.toLocaleString('fr-FR')}</strong><span>meilleur score</span></div>
      <div class="setup-records-stat"><strong>${(records.achievements || []).length}/18</strong><span>réalisations</span></div>
    </div>
  `;
}

// --- MODE GENRE ---
function renderGenreMode(container) {
  const detail = container.querySelector('#setup-detail');
  detail.innerHTML = `
    <div class="setup-panel">
      <h2 class="panel-title">🌍 CHOISIS TON UNIVERS</h2>
      <p class="muted small center">Sélectionne un genre. L'IA génère un pays unique dans cet univers.</p>

      <div class="genre-grid">
        ${Object.entries(GENRES).map(([key, g]) => `
          <button type="button" class="genre-btn ${key === _selectedGenre ? 'selected' : ''}" data-genre="${key}">
            <div class="genre-icon">${g.icon}</div>
            <div class="genre-label">${escapeHtml(g.label)}</div>
            <div class="genre-desc">${escapeHtml(g.desc)}</div>
          </button>
        `).join('')}
      </div>

      <div class="player-name-box">
        <label>Votre nom de dirigeant·e</label>
        <input type="text" id="ai-leader-name" placeholder="Ex: Aelindra, Chen, Marcus…" maxlength="40" />
      </div>

      ${renderTraitsBlock()}

      <button class="primary-btn big-btn" id="generate-nation-btn">
        🎲 GÉNÉRER MON DESTIN
      </button>

      <div id="nation-result"></div>
    </div>
  `;

  detail.querySelectorAll('.genre-btn').forEach((b) => {
    b.addEventListener('click', () => {
      detail.querySelectorAll('.genre-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      _selectedGenre = b.dataset.genre;
    });
  });
  bindTraitsBlock(detail);

  detail.querySelector('#generate-nation-btn').addEventListener('click', () => doGenerateNation(detail));
}

function renderTraitsBlock() {
  return `
    <details class="traits-details">
      <summary class="traits-summary">
        <span>🎭 Profil du dirigeant (optionnel)</span>
        <span class="muted small">L'IA adaptera les choix proposés</span>
      </summary>
      <div class="traits-content">
        ${PLAYER_TRAITS.map((tr) => `
          <div class="trait-row">
            <div class="trait-header">
              <span class="trait-left">${escapeHtml(tr.leftLabel)}</span>
              <span class="trait-right">${escapeHtml(tr.rightLabel)}</span>
            </div>
            <input type="range" min="0" max="100" value="${_traits[tr.id] ?? 50}" data-trait="${tr.id}" class="trait-slider" />
            <div class="trait-desc muted small">${escapeHtml(tr.desc)}</div>
          </div>
        `).join('')}
        <button type="button" class="link-btn" id="reset-traits-btn">Réinitialiser au centre</button>
      </div>
    </details>
  `;
}

function bindTraitsBlock(scope) {
  scope.querySelectorAll('.trait-slider').forEach((s) => {
    s.addEventListener('input', () => { _traits[s.dataset.trait] = Number(s.value); });
  });
  const resetBtn = scope.querySelector('#reset-traits-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      _traits = defaultTraits();
      scope.querySelectorAll('.trait-slider').forEach((s) => { s.value = 50; });
    });
  }
}

async function doGenerateNation(detail) {
  if (_isGenerating) return;
  _isGenerating = true;
  const btn = detail.querySelector('#generate-nation-btn');
  const result = detail.querySelector('#nation-result');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> GÉNÉRATION…';
  const genreInfo = GENRES[_selectedGenre] || GENRES.random;
  result.innerHTML = `
    <div class="generating-anim">
      <div class="genre-current">${genreInfo.icon} ${escapeHtml(genreInfo.label)}</div>
      <div class="flag-roll">🌍 ⚔ 👑 🏰 🛡 🌋 ⚓ 🦅 🐉 🌊</div>
      <p class="muted">L'Histoire écrit votre destin…</p>
    </div>`;

  let res;
  try {
    res = await generateRandomNation(_selectedGenre);
  } catch (err) {
    res = { nation: pickFallbackNation(), fallback: true, error: String(err.message || err) };
  }

  _generatedNation = res.nation;
  _generatedGenre = _selectedGenre;
  btn.disabled = false;
  btn.innerHTML = '🔄 RÉ-GÉNÉRER';

  result.innerHTML = renderNationCard(res.nation, res.fallback);
  result.querySelector('#start-from-ai-btn')?.addEventListener('click', () => {
    const leaderName = (detail.querySelector('#ai-leader-name')?.value || '').trim() || 'Souverain·e';
    startGame(_generatedNation, leaderName, 'gouvernant');
  });

  _isGenerating = false;
}

function renderNationCard(nation, isFallback) {
  const gaugesHtml = GAUGE_KEYS.map((k) => {
    const v = nation.startingGauges[k];
    const g = GAUGES[k];
    return `
      <div class="gauge-row">
        <span class="gauge-icon">${g.icon}</span>
        <span class="gauge-label">${g.label}</span>
        <div class="gauge-bar"><div class="gauge-fill" style="width:${v}%; background:${g.color};"></div></div>
        <span class="gauge-value">${v}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="nation-card">
      <div class="nation-header">
        <div class="nation-flag">${escapeHtml(nation.flag)}</div>
        <div class="nation-name">${escapeHtml(nation.name)}</div>
        <div class="nation-era">${escapeHtml(nation.eraLabel || formatEra(nation.era))}</div>
      </div>
      <div class="nation-body">
        <div class="nation-leader-line">Vous incarnez le ${escapeHtml(nation.leaderTitle)}</div>
        <p class="nation-context">"${escapeHtml(nation.context)}"</p>
        ${nation.firstChallenge ? `<p class="nation-challenge">⚠ Premier défi : ${escapeHtml(nation.firstChallenge)}</p>` : ''}
      </div>
      <div class="nation-gauges">
        <div class="section-title">JAUGES DE DÉPART</div>
        ${gaugesHtml}
      </div>
      ${isFallback ? '<p class="muted small">⚠ Mode démo : l\'IA n\'a pas répondu, nation de secours utilisée.</p>' : ''}
      <div class="nation-actions">
        <button class="primary-btn" id="start-from-ai-btn">👑 COMMENCER LE RÈGNE</button>
      </div>
    </div>
  `;
}

// --- MODE CUSTOM ---
function renderCustomMode(container) {
  const detail = container.querySelector('#setup-detail');
  detail.innerHTML = `
    <div class="setup-panel">
      <h2 class="panel-title">✍ CONFIGURE TON RÈGNE</h2>

      <div class="form-section">
        <label class="form-label">Nom du pays</label>
        <input type="text" id="custom-country-name" placeholder="Ex: Royaume d'Eldoria, République de Veris…" maxlength="40" />
      </div>

      <div class="form-section">
        <label class="form-label">Drapeau / emblème</label>
        <div class="flag-grid">
          ${FLAG_GRID.map((f, i) => `<button type="button" class="flag-btn ${i === 0 ? 'selected' : ''}" data-flag="${escapeHtml(f)}">${f}</button>`).join('')}
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">Époque</label>
        <select id="custom-era">
          ${ERAS.map((e) => `<option value="${e.value}">${escapeHtml(e.label)}</option>`).join('')}
        </select>
        <input type="text" id="custom-era-other" placeholder="Décrivez votre époque…" style="display:none;" maxlength="80" />
      </div>

      <div class="form-section">
        <label class="form-label">Votre nom de dirigeant·e</label>
        <input type="text" id="custom-leader-name" placeholder="Ex: Aelindra, Chen, Marcus…" maxlength="40" />
      </div>

      <div class="form-section">
        <label class="form-label">Votre titre</label>
        <input type="text" id="custom-leader-title" list="title-list" placeholder="Roi, Présidente, Sultan…" maxlength="40" />
        <datalist id="title-list">
          ${TITLES.map((t) => `<option value="${escapeHtml(t)}">`).join('')}
        </datalist>
      </div>

      <div class="form-section">
        <label class="form-label">Difficulté</label>
        <div class="difficulty-grid">
          ${Object.entries(DIFFICULTY_MODIFIERS).map(([key, d]) => `
            <button type="button" class="difficulty-btn ${key === 'gouvernant' ? 'selected' : ''}" data-diff="${key}">
              <div class="diff-label">${d.label}</div>
              <div class="diff-desc">${d.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>

      ${renderTraitsBlock()}

      <button class="primary-btn big-btn" id="custom-start-btn">👑 COMMENCER LE RÈGNE</button>
    </div>
  `;
  bindTraitsBlock(detail);

  detail.querySelectorAll('.flag-btn').forEach((b) => {
    b.addEventListener('click', () => {
      detail.querySelectorAll('.flag-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      _selectedFlag = b.dataset.flag;
    });
  });

  let selectedDiff = 'gouvernant';
  detail.querySelectorAll('.difficulty-btn').forEach((b) => {
    b.addEventListener('click', () => {
      detail.querySelectorAll('.difficulty-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedDiff = b.dataset.diff;
    });
  });

  const eraSelect = detail.querySelector('#custom-era');
  const eraOther = detail.querySelector('#custom-era-other');
  eraSelect.addEventListener('change', () => {
    eraOther.style.display = eraSelect.value === 'autre' ? 'block' : 'none';
  });

  detail.querySelector('#custom-start-btn').addEventListener('click', async () => {
    const name = detail.querySelector('#custom-country-name').value.trim();
    if (!name) {
      const { toastWarn } = await import('./ui-toast.js');
      toastWarn('Donnez un nom à votre pays.');
      return;
    }
    const eraKey = eraSelect.value;
    const eraLabel = eraKey === 'autre'
      ? (eraOther.value.trim() || 'Époque indéterminée')
      : (ERAS.find((e) => e.value === eraKey)?.label || eraKey);

    const leaderName = detail.querySelector('#custom-leader-name').value.trim() || 'Souverain·e';
    const leaderTitle = detail.querySelector('#custom-leader-title').value.trim() || 'Dirigeant·e';

    const nation = {
      name,
      flag: _selectedFlag,
      era: eraKey,
      eraLabel,
      leaderTitle,
      context: `Vous prenez la tête de ${name}. L'avenir est à écrire.`,
      firstChallenge: 'Le règne commence dans l\'incertitude.',
      atmosphere: 'tendu',
      startingGauges: getStartingGauges(selectedDiff)
    };

    startGame(nation, leaderName, selectedDiff);
  });
}

function startGame(nation, leaderName, difficulty) {
  let startingGauges = nation.startingGauges || getStartingGauges(difficulty);
  // NewGame+ : +5 par jauge
  if (_isNewGamePlus) {
    startingGauges = { ...startingGauges };
    for (const k of GAUGE_KEYS) startingGauges[k] = Math.min(95, startingGauges[k] + 5);
  }
  // Reliques actives : appliquent override + bonus aux jauges de départ.
  const activeRelics = Storage.getActiveRelics();
  if (activeRelics.length) {
    startingGauges = applyRelicEffects(startingGauges, activeRelics);
  }
  // Bonus streak : si le joueur joue ≥ 7 jours consécutifs, +5 sur toutes les jauges.
  const _streak = Storage.getRecords().streakDays || 0;
  if (_streak >= 7) {
    startingGauges = { ...startingGauges };
    for (const k of GAUGE_KEYS) startingGauges[k] = Math.min(95, startingGauges[k] + 5);
  }

  const advisors = generateAdvisors(_generatedGenre || nation.era || 'default', nation.name);
  // Phase WSS-4 : nations voisines IA dynamiques
  const neighbors = generateNeighbors(_generatedGenre || nation.era || 'default', 3);

  const gameState = {
    gameId: uuid(),
    country: {
      name: nation.name,
      flag: nation.flag || '👑',
      era: nation.era,
      eraLabel: nation.eraLabel,
      context: nation.context,
      leaderName,
      leaderTitle: nation.leaderTitle,
      firstChallenge: nation.firstChallenge,
      atmosphere: nation.atmosphere
    },
    difficulty,
    genre: _generatedGenre,
    isNewGamePlus: _isNewGamePlus,
    activeRelics: [...activeRelics],
    mode: _selectedMode || 'classic', // classic | heritage | chronicle (Phase 3)
    heritageCrises: 0,
    eraIndex: 0,
    arcsCompleted: [],
    secretsTriggered: [],
    traits: { ..._traits },
    initialTraits: { ..._traits }, // snapshot pour mesurer la dérive idéologique (Phase WSS-1)
    advisors,
    neighbors,
    market: defaultMarket(),
    tech: defaultTech(),
    gauges: { ...startingGauges },
    startingGauges: { ...startingGauges },
    turn: 1,
    year: getStartingYear(nation.era),
    history: [],
    keyFacts: nation.firstChallenge ? [nation.firstChallenge] : [],
    choiceHistory: [],
    started: Date.now(),
    totalTokensUsed: 0,
    totalCostUsd: 0
  };

  // Dynastie : si l'utilisateur vient de cliquer "Continuer la lignée", la dynastie courante
  // existe déjà dans Meta — on la rattache. Sinon on en crée une nouvelle.
  const currentDyn = Storage.getCurrentDynasty();
  if (currentDyn && currentDyn.currentGameId === null && _continueLineage) {
    Storage.continueDynasty(gameState);
    gameState.dynastyId = currentDyn.id;
    gameState.dynastyGeneration = (currentDyn.length || 0) + 1;
  } else {
    const dyn = Storage.startDynasty(gameState);
    gameState.dynastyId = dyn.id;
    gameState.dynastyGeneration = 1;
  }
  _continueLineage = false;

  // Phase WSS-3 : Scénarios historiques — précharge un arc narratif si défini
  if (nation.historicalArcId) {
    gameState.activeArcId = nation.historicalArcId;
    gameState.arcStartTurn = 1;
    gameState.activeArcHint = `Scénario historique : tour 1 — la situation s'amorce.`;
  }

  Storage.saveCurrentGame(gameState);

  // Génération asynchrone des prophéties — non bloquant : on lance la partie immédiatement
  // et on attache le résultat dès qu'il arrive.
  generateProphecies(gameState).then((prophecies) => {
    if (Array.isArray(prophecies) && prophecies.length) {
      const cur = Storage.getCurrentGame();
      // Garde-fou : ne pas écrire sur une autre partie si l'utilisateur a abandonné entre-temps.
      if (cur && cur.gameId === gameState.gameId) {
        cur.prophecies = prophecies;
        Storage.saveCurrentGame(cur);
      }
    }
  }).catch((err) => console.warn('[setup] prophecies generation failed:', err));

  if (_onStartCallback) _onStartCallback(gameState);
}

// --- RELIQUES (panneau de sélection sur la page d'accueil) ---
// Affiche les reliques débloquées et permet d'en activer jusqu'à 2 avant la prochaine partie.
function renderRelicsSection() {
  const meta = Storage.getMeta();
  const unlocked = new Set(meta.unlockedRelics || []);
  const active = new Set(meta.activeRelics || []);
  const hasUnlocked = unlocked.size > 0;
  return `
    <section class="home-section relics-section">
      <div class="home-section-header">
        <h2 class="home-section-title">${escapeHtml(t('home_relics'))}</h2>
        <span class="home-section-sub">${hasUnlocked
          ? escapeHtml(t('home_relics_status', { unlocked: unlocked.size, total: RELICS.length, active: active.size, max: MAX_ACTIVE_RELICS }))
          : escapeHtml(t('home_relics_unlock_first'))}</span>
      </div>
      <div class="relics-grid">
        ${RELICS.map((r) => {
          const isUnlocked = unlocked.has(r.id);
          const isActive = active.has(r.id);
          const cls = ['relic-card', isUnlocked ? 'unlocked' : 'locked', isActive ? 'active' : ''].filter(Boolean).join(' ');
          return `
            <button class="${cls}" data-relic="${escapeHtml(r.id)}" ${!isUnlocked ? 'disabled' : ''}>
              <div class="relic-icon">${isUnlocked ? r.icon : '🔒'}</div>
              <div class="relic-info">
                <div class="relic-name">${isUnlocked ? escapeHtml(t(r.nameKey)) : '???'}</div>
                <div class="relic-desc">${isUnlocked ? escapeHtml(t(r.descKey)) : '—'}</div>
              </div>
              ${isActive ? '<span class="relic-badge">★</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function bindRelicsSection(container) {
  const cards = container.querySelectorAll('.relic-card[data-relic]');
  cards.forEach((card) => {
    if (card.disabled) return;
    card.addEventListener('click', async () => {
      const id = card.dataset.relic;
      const meta = Storage.getMeta();
      const active = new Set(meta.activeRelics || []);
      if (active.has(id)) {
        active.delete(id);
      } else {
        if (active.size >= MAX_ACTIVE_RELICS) {
          const { toastWarn } = await import('./ui-toast.js');
          toastWarn(`Maximum ${MAX_ACTIVE_RELICS} reliques actives. Désactive-en une d'abord.`);
          return;
        }
        active.add(id);
      }
      Storage.setActiveRelics(Array.from(active));
      // Re-render in place : on remplace juste la section
      const sectionParent = card.closest('.relics-section');
      if (sectionParent) {
        const wrap = document.createElement('div');
        wrap.innerHTML = renderRelicsSection().trim();
        sectionParent.replaceWith(wrap.firstElementChild);
        bindRelicsSection(container);
      }
    });
  });
}

// Hook pour la suite : démarrer dans le mode "continuer la lignée"
export function setContinueLineage(value) {
  _continueLineage = !!value;
}

// --- MODES DE JEU (Phase 3.1 + 3.2) ---
const GAME_MODES = [
  { id: 'classic',   icon: '🎯', labelKey: 'mode_classic',   descKey: 'mode_classic_desc' },
  { id: 'heritage',  icon: '🪶', labelKey: 'mode_heritage',  descKey: 'mode_heritage_desc' },
  { id: 'chronicle', icon: '🏛', labelKey: 'mode_chronicle', descKey: 'mode_chronicle_desc' }
];

function renderGameModesSection() {
  const cur = _selectedMode || 'classic';
  return `
    <section class="home-section game-modes-section">
      <div class="home-section-header">
        <h2 class="home-section-title">${escapeHtml(t('home_modes'))}</h2>
        <span class="home-section-sub">${escapeHtml(t('home_modes_sub'))}</span>
      </div>
      <div class="modes-grid">
        ${GAME_MODES.map((m) => `
          <button class="mode-pill ${m.id === cur ? 'selected' : ''}" data-mode="${m.id}">
            <div class="mode-pill-head"><span class="mode-pill-icon">${m.icon}</span><span class="mode-pill-name">${escapeHtml(t(m.labelKey))}</span></div>
            <div class="mode-pill-desc">${escapeHtml(t(m.descKey))}</div>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function bindGameModesSection(container) {
  container.querySelectorAll('.mode-pill[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      _selectedMode = btn.dataset.mode;
      container.querySelectorAll('.mode-pill').forEach((b) => b.classList.toggle('selected', b === btn));
    });
  });
}
