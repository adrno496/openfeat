// format.js — Formatters et helpers d'affichage

const ERA_LABELS = {
  empire_xvi: 'Empire du XVIe siècle',
  antiquite_rome: 'Rome antique',
  antiquite_grece: 'Grèce antique',
  antiquite_egypte: 'Égypte antique',
  antiquite_perse: 'Perse antique',
  moyen_age_eu: 'Moyen-Âge européen',
  moyen_age_asie: 'Moyen-Âge asiatique',
  moyen_age_orient: 'Moyen-Âge proche-oriental',
  renaissance: 'Renaissance (XVe-XVIe s.)',
  moderne: 'Époque moderne (XVIIe-XIXe s.)',
  xx_siecle: 'XXe siècle',
  contemporain: 'Contemporain (2000-2030)',
  futur_proche: 'Futur proche (2030-2100)',
  futur_lointain: 'Futur lointain (2100+)',
  fantasy: 'Fantasy',
  scifi: 'Sci-fi (space opera)',
  post_apo: 'Post-apocalyptique',
  uchronie: 'Uchronie',
  cyberpunk: 'Cyberpunk',
  steampunk: 'Steampunk',
  autre: 'Autre'
};

export function formatEra(eraKey) {
  return ERA_LABELS[eraKey] || eraKey || 'Époque inconnue';
}

export function formatGauge(value) {
  const v = Math.round(value);
  if (v <= 15) return `⚠ ${v}`;
  if (v >= 85) return `⚡ ${v}`;
  return String(v);
}

export function formatScore(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return n.toLocaleString('fr-FR').replace(/ /g, ',').replace(/\s/g, ',');
}

export function formatTurn(n) {
  return `Tour ${n}`;
}

export function formatYear(n) {
  if (typeof n !== 'number') return '';
  if (n < 0) return `${Math.abs(n)} av. J.-C.`;
  return String(n);
}

export function formatDelta(delta) {
  if (delta === 0) return '—';
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `Il y a ${d} jour${d > 1 ? 's' : ''}`;
  if (h >= 1) return `Il y a ${h} heure${h > 1 ? 's' : ''}`;
  if (m >= 1) return `Il y a ${m} min`;
  return 'À l\'instant';
}

export function formatTokens(n) {
  if (typeof n !== 'number') return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Taux USD → EUR (mis à jour janvier 2026 : 1$ ≈ 0.92€)
// Source : taux de change moyen mensuel BCE
export const USD_TO_EUR = 0.92;

// Affiche un coût (entré en USD) converti en euros, format français.
// Une seule unité sous-euro (centimes) pour que toutes les valeurs du même tableau
// soient comparables d'un coup d'œil — pas de mix m€/¢ trompeur.
export function formatCost(usd) {
  if (typeof usd !== 'number' || isNaN(usd)) return '0€';
  if (usd === 0) return 'Gratuit';
  const eur = usd * USD_TO_EUR;
  if (eur < 0.0001) return '<0,01 ¢';
  if (eur < 1) {
    const cents = eur * 100;
    // 2 décimales sous 0,1 ¢, 1 décimale sinon — précis sans bruit visuel
    const decimals = cents < 0.1 ? 2 : 1;
    return `${cents.toFixed(decimals).replace('.', ',')} ¢`;
  }
  return `${eur.toFixed(2).replace('.', ',')} €`;
}

// Variante détaillée : montre USD ET EUR pour transparence
export function formatCostDetailed(usd) {
  if (typeof usd !== 'number' || isNaN(usd) || usd === 0) return formatCost(usd);
  const eur = usd * USD_TO_EUR;
  const usdStr = usd < 0.01 ? `${(usd * 100).toFixed(2)}¢US` : `$${usd.toFixed(3)}`;
  return `${formatCost(usd)} (${usdStr})`;
}

export function formatEndingType(type) {
  // i18n : on essaie de résoudre via t(), avec fallback FR codé en dur si i18n indispo.
  try {
    // Import dynamique synchrone via globalThis (i18n.js est statique mais on évite les cycles)
    if (typeof globalThis.__i18n_t === 'function') {
      const k = `ending_${type}`;
      const r = globalThis.__i18n_t(k);
      if (r && r !== k) return r;
    }
  } catch {}
  const labels = {
    legendary: '✨ LÉGENDAIRE',
    great: '👑 GLORIEUX',
    good: '⚔ BON',
    neutral: '⚖ NEUTRE',
    bad: '⛓ MAUVAIS',
    catastrophic: '💀 CATASTROPHIQUE'
  };
  return labels[type] || 'INDÉTERMINÉ';
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function truncate(str, max = 100) {
  if (typeof str !== 'string') return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

export function uuid() {
  // RFC4122 v4-ish, suffisant pour identifiant local
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
