import { MODES } from '../modes/index.js';
import { navigate } from '../router.js';
import { getEnabledProviders } from '../state.js';

const TIER_ORDER = ['classic', 'soft', 'chill', 'piquant', 'edgy'];
const TIER_LABELS = {
  classic: { title: '⚙️ Modes classiques', sub: 'Les bases, accessibles à tous' },
  soft: { title: '🌱 Soft', sub: 'Discussions douces et créatives' },
  chill: { title: '☕ Chill', sub: 'Détente, jeu, exploration' },
  piquant: { title: '🌶️ Piquant', sub: 'Humour mordant, parti pris' },
  edgy: { title: '🥊 Edgy', sub: 'Plus relâché, à manier avec second degré' }
};

export function HomeView(root) {
  const enabled = getEnabledProviders();

  const grouped = {};
  for (const m of Object.values(MODES)) {
    const tier = m.tier || 'classic';
    (grouped[tier] = grouped[tier] || []).push(m);
  }

  const cardOf = (m) => `
    <button class="mode-card" data-mode="${m.id}">
      <span class="mode-emoji">${m.emoji}</span>
      <div class="mode-name">${m.name}</div>
      <div class="mode-tagline">${m.tagline}</div>
      <span class="mode-difficulty">${m.difficulty}</span>
    </button>
  `;

  const sectionsHtml = TIER_ORDER.filter((t) => grouped[t]).map((tier) => `
    <div class="tier-section" data-tier="${tier}">
      <h2 class="tier-title">${TIER_LABELS[tier].title}</h2>
      <p class="tier-sub">${TIER_LABELS[tier].sub}</p>
      <div class="mode-grid">${grouped[tier].map(cardOf).join('')}</div>
    </div>
  `).join('');

  root.innerHTML = `
    <h1>Choisis un mode</h1>
    <p class="subtitle">Deux IA s'affrontent ou collaborent. Toi, tu observes — et tu peux intervenir à tout moment.</p>
    ${enabled.length < 2 ? `
      <div class="warning">
        ⚠️ Tu as besoin d'au moins 2 providers configurés pour jouer.
        <button class="btn btn-small" id="goSettingsCta" style="margin-left: 8px;">Configurer →</button>
      </div>
    ` : ''}
    ${sectionsHtml}
  `;

  root.querySelectorAll('.mode-card').forEach((btn) => {
    btn.onclick = () => navigate('lobby', { modeId: btn.dataset.mode });
  });
  const cta = root.querySelector('#goSettingsCta');
  if (cta) cta.onclick = () => navigate('settings');
}
