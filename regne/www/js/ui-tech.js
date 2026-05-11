// ui-tech.js — Modale d'arbre de développement (Phase WSS-6).
// 4 branches × 4 paliers, coûts en treasury (jauge 0..100), labels par genre.

import { Storage } from './storage.js';
import { TECH_BRANCHES, getTechLabel, canUnlockTech, GAUGES } from './game-engine.js';
import { escapeHtml } from './format.js';
import { t } from './i18n.js';

let _onUnlockCallback = null;
let _container = null;

export function openTechModal(gameState, onUnlock) {
  if (typeof document === 'undefined') return;
  // Garde-fou : si une modale est déjà ouverte, on la ferme avant d'en ouvrir une nouvelle
  if (_container && _container.isConnected) closeModal();
  _onUnlockCallback = onUnlock;
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay tech-overlay';
  overlay.innerHTML = renderModal(gameState);
  document.body.appendChild(overlay);
  _container = overlay;
  bindEvents(overlay, gameState);
  overlay.querySelector('.tech-close-btn')?.addEventListener('click', () => closeModal());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
  if (_container) { try { _container.remove(); } catch {} }
  _container = null;
}

function renderModal(gameState) {
  const genre = gameState?.genre || gameState?.country?.era || 'default';
  const tech = gameState?.tech || { economy: 0, military: 0, society: 0, innovation: 0 };
  const treasury = gameState?.gauges?.treasury ?? 0;

  return `
    <div class="tech-card">
      <header class="tech-header">
        <h2 class="royal-title">${escapeHtml(t('tech_title'))}</h2>
        <div class="tech-treasury">${escapeHtml(t('tech_treasury', { n: treasury }))}</div>
        <button class="icon-btn tech-close-btn" aria-label="${escapeHtml(t('close'))}">✕</button>
      </header>
      <p class="muted small">${escapeHtml(t('tech_intro'))}</p>
      <div class="tech-grid">
        ${TECH_BRANCHES.map((branch) => {
          const lvl = tech[branch.id] ?? 0;
          const label = getTechLabel(branch.id, genre);
          const tiersHtml = branch.tiers.map((tier) => {
            const unlocked = lvl >= tier.tier;
            const isNext = lvl === tier.tier - 1;
            const canAfford = treasury >= tier.cost;
            const cls = unlocked ? 'tier-unlocked' : (isNext ? (canAfford ? 'tier-available' : 'tier-locked-cost') : 'tier-locked');
            const bonusStr = Object.entries(tier.bonus || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${GAUGES[k]?.label || k}`).join(', ');
            return `
              <div class="tier-card ${cls}" data-branch="${branch.id}" data-tier="${tier.tier}">
                <div class="tier-head">
                  <span class="tier-label">${escapeHtml(tier.label)}</span>
                  <span class="tier-cost">💰 ${tier.cost}</span>
                </div>
                <div class="tier-bonus">${escapeHtml(bonusStr)}</div>
                <div class="tier-cadence">${escapeHtml(t('tech_every', { n: tier.bonusEvery }))}</div>
                ${isNext && canAfford ? `<button class="primary-btn tech-unlock-btn" data-branch="${branch.id}">${escapeHtml(t('tech_unlock'))}</button>` : ''}
                ${unlocked ? `<div class="tier-status">${escapeHtml(t('tech_unlocked'))}</div>` : ''}
              </div>
            `;
          }).join('');
          return `
            <div class="tech-branch">
              <h3 class="tech-branch-title">${branch.icon} ${escapeHtml(label)}</h3>
              <div class="tech-tiers">${tiersHtml}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function bindEvents(overlay, gameState) {
  overlay.querySelectorAll('.tech-unlock-btn[data-branch]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const branchId = btn.dataset.branch;
      const cur = Storage.getCurrentGame();
      if (!cur) return;
      const check = canUnlockTech(cur.gauges?.treasury ?? 0, cur.tech || {}, branchId);
      if (!check.ok) {
        const { toastWarn } = await import('./ui-toast.js');
        if (check.reason === 'no_treasury') toastWarn(t('tech_no_treasury', { n: check.cost }));
        else if (check.reason === 'maxed') toastWarn(t('tech_maxed'));
        return;
      }
      // Débit du coût + incrément du tier
      cur.gauges = { ...cur.gauges, treasury: Math.max(0, (cur.gauges?.treasury ?? 0) - check.cost) };
      cur.tech = { ...(cur.tech || {}), [branchId]: (cur.tech?.[branchId] ?? 0) + 1 };
      Storage.saveCurrentGame(cur);
      const { toastSuccess } = await import('./ui-toast.js');
      const tierLabel = check.tier?.label || 'tier';
      toastSuccess(t('tech_unlocked_toast', { label: tierLabel }));
      import('./audio.js').then((m) => m.playTone('unlock')).catch(() => {});
      // Re-render la modale avec le nouvel état
      _container.innerHTML = renderModal(cur);
      bindEvents(_container, cur);
      _container.querySelector('.tech-close-btn')?.addEventListener('click', () => closeModal());
      if (_onUnlockCallback) _onUnlockCallback(cur);
    });
  });
}
