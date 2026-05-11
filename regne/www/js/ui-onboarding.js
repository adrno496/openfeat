// ui-onboarding.js — Tutoriel au premier lancement.
// Slidable, multilingue, persistant via Storage.settings.onboardingDone.
// Fournit aussi une commande de relance via /Paramètres/Aide pour les utilisateurs qui veulent revoir.

import { Storage } from './storage.js';
import { t } from './i18n.js';
import { escapeHtml } from './format.js';

const SLIDES = [
  { id: 1, icon: '👑', titleKey: 'onb_1_title', bodyKey: 'onb_1_body' },
  { id: 2, icon: '⚖', titleKey: 'onb_2_title', bodyKey: 'onb_2_body' },
  { id: 3, icon: '✍', titleKey: 'onb_3_title', bodyKey: 'onb_3_body' },
  { id: 4, icon: '🜲', titleKey: 'onb_4_title', bodyKey: 'onb_4_body' },
  { id: 5, icon: '🌐', titleKey: 'onb_5_title', bodyKey: 'onb_5_body' }
];

let _overlay = null;
let _index = 0;
let _resolveDone = null;

export function shouldShowOnboarding() {
  try {
    return Storage.getSettings().onboardingDone !== true;
  } catch {
    return true;
  }
}

export function markOnboardingDone() {
  try { Storage.saveSettings({ onboardingDone: true }); } catch (err) { console.warn('[onboarding] save failed:', err); }
}

// Affiche le tutoriel. Retourne une Promise qui résout quand l'utilisateur l'a fini ou skippé.
export function showOnboarding() {
  if (typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    _resolveDone = resolve;
    _index = 0;
    _overlay = document.createElement('div');
    _overlay.className = 'onboarding-overlay';
    _overlay.innerHTML = renderSlide();
    document.body.appendChild(_overlay);
    bindEvents();
  });
}

function renderSlide() {
  const total = SLIDES.length;
  const slide = SLIDES[_index];
  const isFirst = _index === 0;
  const isLast = _index === total - 1;
  const dots = SLIDES.map((_, i) => `<span class="onb-dot ${i === _index ? 'active' : ''}"></span>`).join('');
  return `
    <div class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <button class="onb-skip" aria-label="${escapeHtml(t('onb_skip'))}">${escapeHtml(t('onb_skip'))} ✕</button>
      <div class="onb-step muted small">${escapeHtml(t('onb_step', { n: _index + 1, total }))}</div>
      <div class="onb-icon" aria-hidden="true">${slide.icon}</div>
      ${isFirst ? '<img class="onb-logo" src="logo.png" alt="" width="80" height="80">' : ''}
      <h2 class="onb-title royal-title" id="onb-title">${escapeHtml(t(slide.titleKey))}</h2>
      <p class="onb-body">${escapeHtml(t(slide.bodyKey))}</p>
      <div class="onb-dots" aria-hidden="true">${dots}</div>
      <div class="onb-actions">
        <button class="link-btn onb-prev" ${isFirst ? 'style="visibility:hidden"' : ''}>← ${escapeHtml(t('onb_back'))}</button>
        ${isLast
          ? `<button class="primary-btn big-btn onb-finish">${escapeHtml(t('onb_start'))}</button>`
          : `<button class="primary-btn onb-next">${escapeHtml(t('onb_next'))} →</button>`}
      </div>
    </div>
  `;
}

function bindEvents() {
  if (!_overlay) return;
  _overlay.querySelector('.onb-skip')?.addEventListener('click', () => finish());
  _overlay.querySelector('.onb-prev')?.addEventListener('click', () => {
    if (_index > 0) { _index--; rerender(); }
  });
  _overlay.querySelector('.onb-next')?.addEventListener('click', () => {
    if (_index < SLIDES.length - 1) { _index++; rerender(); }
  });
  _overlay.querySelector('.onb-finish')?.addEventListener('click', () => finish());
  // Clavier : ← →, Esc pour skip
  _overlay.addEventListener('keydown', handleKeydown);
  // Focus pour activer la nav clavier
  _overlay.tabIndex = -1;
  setTimeout(() => _overlay?.focus?.(), 0);
}

function handleKeydown(e) {
  if (e.key === 'Escape') { finish(); return; }
  if (e.key === 'ArrowLeft' && _index > 0) { _index--; rerender(); return; }
  if (e.key === 'ArrowRight') {
    if (_index < SLIDES.length - 1) { _index++; rerender(); }
    else finish();
  }
}

function rerender() {
  if (!_overlay) return;
  // Animation : fade-out → swap content → fade-in
  const card = _overlay.querySelector('.onboarding-card');
  if (card) card.classList.add('onb-fade-out');
  setTimeout(() => {
    if (!_overlay) return;
    _overlay.innerHTML = renderSlide();
    bindEvents();
  }, 150);
}

function finish() {
  markOnboardingDone();
  if (_overlay) {
    _overlay.classList.add('onb-leaving');
    setTimeout(() => {
      try { _overlay?.remove(); } catch {}
      _overlay = null;
      const r = _resolveDone; _resolveDone = null;
      if (r) r();
    }, 250);
  } else {
    const r = _resolveDone; _resolveDone = null;
    if (r) r();
  }
}
