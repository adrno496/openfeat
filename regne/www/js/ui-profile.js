// ui-profile.js — Tableau de bord méta : titre, stats cumulées, reliques, achievements, dynasties.

import { Storage } from './storage.js';
import { ACHIEVEMENTS, RELICS, getRelicById, computeCurrentTitle, computeNextTitle, TITLES } from './game-engine.js';
import { escapeHtml, formatScore, formatTokens, formatRelativeTime } from './format.js';
import { renderEvolutionChart } from './ui-gameover.js';
import { t } from './i18n.js';

export function renderProfile(container, callbacks = {}) {
  const records = Storage.getRecords();
  const meta = Storage.getMeta();
  const settings = Storage.getSettings();
  const currentTitle = computeCurrentTitle(records);
  const { next: nextTitle } = computeNextTitle(records);
  const streak = computeStreak(records);

  const unlockedAchievements = new Set(records.achievements || []);
  const unlockedRelics = new Set(meta.unlockedRelics || []);
  const dynasties = (meta.dynasties || []).slice().sort((a, b) => (b.length || 0) - (a.length || 0)).slice(0, 5);

  // Distribution des fins (camembert SVG simple)
  const endingChartHtml = renderEndingChart(records.endingTypeCount || {});

  container.innerHTML = `
    <div class="profile-screen">
      <header class="panel-header">
        <button class="back-btn" id="profile-back">${escapeHtml(t('back'))}</button>
        <h2 class="royal-title">${escapeHtml(t('profile_title'))}</h2>
      </header>

      <section class="profile-title-section">
        <div class="profile-title-icon">👑</div>
        <div class="profile-title-info">
          <div class="profile-title-current">${escapeHtml(currentTitle.label)}</div>
          ${nextTitle ? `<div class="profile-title-next muted small">${escapeHtml(t('profile_next', { label: nextTitle.label }))}</div>` : `<div class="profile-title-next muted small">${escapeHtml(t('profile_max'))}</div>`}
        </div>
        ${streak.streakDays >= 2 ? `<div class="streak-badge">${escapeHtml(t('profile_streak', { n: streak.streakDays }))}</div>` : ''}
      </section>

      <section class="profile-stats">
        <div class="stat-card-mini">
          <div class="stat-label-mini">${escapeHtml(t('profile_total_games'))}</div>
          <div class="stat-value-mini">${records.totalGames || 0}</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-label-mini">${escapeHtml(t('profile_total_turns'))}</div>
          <div class="stat-value-mini">${records.totalTurns || 0}</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-label-mini">${escapeHtml(t('profile_best_score'))}</div>
          <div class="stat-value-mini">${formatScore(records.bestScore || 0)}</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-label-mini">${escapeHtml(t('profile_longest_reign'))}</div>
          <div class="stat-value-mini">${records.bestTurns || 0}</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-label-mini">${escapeHtml(t('profile_genres'))}</div>
          <div class="stat-value-mini">${records.distinctGenresPlayed || 0}</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-label-mini">${escapeHtml(t('profile_tokens'))}</div>
          <div class="stat-value-mini">${formatTokens(settings.totalTokensUsed || 0)}</div>
        </div>
      </section>

      <section class="profile-section">
        <h3 class="section-title">${escapeHtml(t('profile_relics', { unlocked: unlockedRelics.size, total: RELICS.length }))}</h3>
        <div class="profile-relics-grid">
          ${RELICS.map((r) => {
            const u = unlockedRelics.has(r.id);
            return `<div class="profile-relic ${u ? 'unlocked' : 'locked'}" title="${escapeHtml(u ? t(r.descKey) : '—')}">
              <span class="relic-icon">${u ? r.icon : '🔒'}</span>
              <span class="relic-name">${u ? escapeHtml(t(r.nameKey)) : '???'}</span>
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="profile-section">
        <h3 class="section-title">${escapeHtml(t('profile_achievements', { unlocked: unlockedAchievements.size, total: ACHIEVEMENTS.length }))}</h3>
        <div class="profile-achievements-grid">
          ${ACHIEVEMENTS.map((a) => {
            const u = unlockedAchievements.has(a.id);
            const display = u ? a.label : (a.secret ? '???' : a.label);
            return `<div class="profile-achievement ${u ? 'unlocked' : 'locked'} ${a.secret && !u ? 'secret' : ''}" title="${escapeHtml(u ? a.description : (a.secret ? 'Achievement secret' : a.description))}">
              <span class="ach-icon">${u ? a.icon : (a.secret ? '🔒' : '·')}</span>
              <span class="ach-label">${escapeHtml(display)}</span>
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="profile-section">
        <h3 class="section-title">${escapeHtml(t('profile_endings'))}</h3>
        ${endingChartHtml}
      </section>

      ${(() => {
    // Évolution du dernier règne en cours (si présent)
    const cur = Storage.getCurrentGame();
    if (!cur || !cur.choiceHistory?.length) return '';
    const chart = renderEvolutionChart(cur.choiceHistory, cur.startingGauges);
    return chart ? `<section class="profile-section">
      <h3 class="section-title">${escapeHtml(t('profile_current_reign', { name: cur.country?.name || '' }))}</h3>
      ${chart}
    </section>` : '';
  })()}

      ${dynasties.length ? `
        <section class="profile-section">
          <h3 class="section-title">${escapeHtml(t('profile_dynasties'))}</h3>
          <ul class="profile-dynasties">
            ${dynasties.map((d) => `<li><strong>${escapeHtml(d.name || 'Sans nom')}</strong> — ${d.length} génération${d.length > 1 ? 's' : ''} <span class="muted small">(${formatRelativeTime(d.startedAt)})</span></li>`).join('')}
          </ul>
        </section>
      ` : ''}

      <section class="profile-section">
        <h3 class="section-title">${escapeHtml(t('profile_titles', { cur: TITLES.findIndex((tt) => tt.id === currentTitle.id) + 1, total: TITLES.length }))}</h3>
        <ul class="titles-list">
          ${TITLES.map((tt) => {
            const reached = tt.rank <= currentTitle.rank;
            return `<li class="title-row ${reached ? 'reached' : 'locked'}">
              <span class="title-rank">${tt.rank}</span>
              <span class="title-label">${escapeHtml(tt.label)}</span>
              <span class="title-mark">${reached ? '✓' : '·'}</span>
            </li>`;
          }).join('')}
        </ul>
      </section>
    </div>
  `;

  container.querySelector('#profile-back').addEventListener('click', () => callbacks.onBack && callbacks.onBack());
}

// Streak : nombre de jours consécutifs joués (basé sur lastPlayedAt + dailyStreak persisté).
export function computeStreak(records = {}) {
  const last = records.lastPlayedAt || 0;
  const streakDays = records.streakDays || 0;
  if (!last) return { streakDays: 0, lastPlayedAt: 0 };
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = now - last;
  if (diff > 2 * dayMs) return { streakDays: 0, lastPlayedAt: last }; // streak cassée
  return { streakDays, lastPlayedAt: last };
}

// Délégué à Storage.updateStreak pour passer par safeSetItem.
export function updateStreakOnGameEnd() {
  return Storage.updateStreak();
}

// Camembert SVG des causes de fin (gauges fatales).
function renderEndingChart(counts) {
  const labels = {
    legendary: 'Légendaire',
    great: 'Glorieux',
    good: 'Bon',
    neutral: 'Neutre',
    bad: 'Mauvais',
    catastrophic: 'Catastrophique'
  };
  const colors = {
    legendary: '#e0bc78',
    great: '#c9a961',
    good: '#5a8a5a',
    neutral: '#7a7a7a',
    bad: '#8b3a3a',
    catastrophic: '#5a1818'
  };
  const entries = Object.entries(counts || {}).filter(([_, n]) => n > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return `<p class="muted small">${escapeHtml(t('profile_no_games'))}</p>`;
  const cx = 70, cy = 70, R = 60;
  let cumulative = 0;
  const slices = entries.map(([type, n]) => {
    const start = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += n;
    const end = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const large = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
    const d = `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
    return `<path d="${d}" fill="${colors[type] || '#888'}" stroke="#0d0a06" stroke-width="1.2" />`;
  }).join('');
  const legend = entries.map(([type, n]) => `
    <li><span class="legend-dot" style="background:${colors[type] || '#888'}"></span> ${escapeHtml(labels[type] || type)} : ${n} (${Math.round(100 * n / total)}%)</li>
  `).join('');
  return `
    <div class="ending-chart">
      <svg viewBox="0 0 140 140" width="140" height="140">${slices}</svg>
      <ul class="ending-legend">${legend}</ul>
    </div>
  `;
}
