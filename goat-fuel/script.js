(() => {
'use strict';

/* ============================================================
   STATE
============================================================ */
const state = {
  slides: [],            // [{ img, title, subtitle, footer, vertical, template, badges }]
  currentIdx: 0,
  format: 'play',        // 'play' | 'app'
  template: 'hero',      // 'hero' | 'feature' | 'proof' | 'comparison'
  style: 'aggressive',   // 'minimal' | 'aggressive' | 'premium'
  colors: { bg: '#0A0A0A', c1: '#FF3B30', c2: '#FF9500' },
  lang: 'fr',            // 'fr' | 'en' | 'de' | 'it' | 'es'
  pendingTexts: []       // restored from localStorage; consumed on upload
};

const STORAGE_KEY = 'goatfuel_session';
const SCHEMA_VERSION = 1;
let INITIALIZED = false;  // flips after init resolves the resume banner

const FORMATS = {
  play: { w: 1080, h: 1920, label: 'Play Store · 1080×1920' },
  app:  { w: 1290, h: 2796, label: 'App Store · 1290×2796' }
};

/* ============================================================
   VERTICAL POOLS — structured by language, then by vertical role.
   Each entry = { title, subtitle, footer }. FR is the canonical pool.
   Other languages fall back to FR until filled (see step 7).
============================================================ */
const VERTICAL_POOLS = {
  fr: {
    generic: [
      { title: 'PASSE EN MODE GOAT',         subtitle: 'La discipline paie.',                     footer: 'Rien ne se donne.' },
      { title: 'TRANSFORME TON CORPS',       subtitle: 'Entraînement • Nutrition • Résultats',    footer: 'La méthode GOAT.' },
      { title: 'DISCIPLINE. RÉSULTATS.',     subtitle: 'Rien ne se donne.',                       footer: 'Tout se gagne.' },
      { title: 'DEVIENS LE GOAT',            subtitle: 'Ton seul adversaire : hier.',             footer: 'Hors zone de confort.' },
      { title: 'DOMINE TA JOURNÉE',          subtitle: 'Chaque rep compte.',                      footer: 'Aucune excuse.' },
      { title: 'NIVEAU SUPÉRIEUR',           subtitle: 'Débloqué.',                               footer: 'La constance gagne.' },
      { title: 'FORGE TON MENTAL',           subtitle: 'Le corps suivra.',                        footer: 'Jour après jour.' },
      { title: 'CHAMPION OU SPECTATEUR',     subtitle: 'Tu choisis.',                             footer: 'Lève-toi. Grind. Répète.' }
    ],
    hook: [
      { title: 'TON COACH FITNESS TOUT-EN-UN',     subtitle: 'Muscu · HYROX · Run · Nutrition · Coach IA', footer: '🐐 1 app au lieu de 4 · 28× moins cher' },
      { title: 'TOUT TON FITNESS DANS UNE APP',    subtitle: 'Entraînement, nutrition, IA, communauté',    footer: '💪 Plus jamais 5 abonnements' },
      { title: 'ARRÊTE DE JONGLER ENTRE 4 APPS',   subtitle: 'GOAT FUEL réunit tout en un',                footer: '🚀 Économise temps & argent' },
      { title: "L'APP FITNESS FRANÇAISE COMPLÈTE", subtitle: 'Muscu, HYROX, run, nutrition, IA',           footer: '🇫🇷 100% RGPD · Sans pub' },
      { title: 'PRÊT POUR LE NIVEAU SUPÉRIEUR ?',  subtitle: 'Une app, tous tes objectifs',                footer: '🐐 28× moins cher que la concurrence' }
    ],
    coach_ia: [
      { title: 'COACH IA QUI TE CONNAÎT',          subtitle: '24/7 · Personnalisé · Adapté à TON historique',   footer: 'Programme · Nutrition · Motivation sur mesure' },
      { title: 'UN COACH PRO DANS TA POCHE',       subtitle: 'IA entraînée par des athlètes pro',               footer: '💬 Réponses 24/7 sans rendez-vous' },
      { title: 'PROGRAMMES SUR MESURE EN 30 SEC',  subtitle: "L'IA analyse, tu transpires",                     footer: '🧠 100x plus précis qu’un PDF générique' },
      { title: 'ADAPTÉ À TON HISTORIQUE EXACT',    subtitle: "L'IA voit ce que tu fais, ajuste ce qu'il faut",  footer: 'Auto-évolution séance après séance' },
      { title: "POSE N'IMPORTE QUELLE QUESTION",   subtitle: 'Nutrition, technique, mental — réponse en 2 sec', footer: '🤖 Comme un coach pro · Disponible 24/7' }
    ],
    hyrox: [
      { title: "L'APP HYROX LA PLUS COMPLÈTE",   subtitle: 'Pacing · Plans 12 sem · Classement mondial',  footer: '🏟️ 250 000 athlètes HYROX en Europe' },
      { title: 'PRÉPARE TON HYROX COMME UN PRO', subtitle: 'Plans 8/12/16 semaines validés',              footer: '🏆 Pacing par station · Stratégie course' },
      { title: 'CLASSEMENT HYROX MONDIAL',       subtitle: 'Tes temps, ton rang, ta progression',         footer: '🌍 La référence FR pour HYROX' },
      { title: 'PACING TEMPS RÉEL HYROX',        subtitle: 'Sled · Burpees · Ski-erg · Run',              footer: '⏱️ Battre ton PR à coup sûr' },
      { title: 'DE COURIR À FINISHER HYROX',     subtitle: 'Plans complets pour ta première compé',       footer: '🥇 Suivi auto · Compétitions notées' }
    ],
    motion: [
      { title: "7 UNIVERS D'ENTRAÎNEMENT",       subtitle: '1500+ exos · Programmes adaptatifs · Cardio',   footer: 'Forge · Arsenal · Ascension · Engine · Pace · HYROX · Arena' },
      { title: '1500+ EXERCICES À UN TAP',       subtitle: 'Vidéos HD · Variantes · Niveau adaptatif',      footer: 'Du débutant au compétiteur' },
      { title: 'UN UNIVERS PAR OBJECTIF',        subtitle: 'Force, hypertrophie, endurance, course, HYROX', footer: 'Choisis ta voie GOAT' },
      { title: 'PROGRAMMES ADAPTATIFS',          subtitle: "L'IA ajuste les charges en temps réel",         footer: '🔥 Plus jamais de séance trop facile' },
      { title: 'CARDIO + FORCE + RUN + HYROX',   subtitle: '7 univers connectés, 1 progression',            footer: 'Tout connecté, rien à gérer' }
    ],
    nutrition: [
      { title: 'NUTRITION + SCAN AUTO',          subtitle: 'Macros · Calories · TDEE · Codes-barres',      footer: '🥗 Alternative française à MyFitnessPal' },
      { title: 'SCANNE TON REPAS, MANGE SAIN',   subtitle: 'Code-barre, photo, voix — calculé en 2 sec',   footer: '🥑 Base FR de 50 000+ aliments' },
      { title: 'CALCUL TDEE + MACROS AUTO',      subtitle: 'Adapté à ta séance du jour',                   footer: '🇫🇷 100% en français · 100% RGPD' },
      { title: 'PHOTO TON ASSIETTE → MACROS',    subtitle: 'IA reconnaît, calcule, ajuste',                footer: '📸 Plus jamais de saisie manuelle' },
      { title: 'NUTRITION SANS PRISE DE TÊTE',   subtitle: 'Plans adaptatifs · Recettes intégrées',        footer: '🥗 Alternative française à MyFitnessPal' }
    ],
    prs: [
      { title: 'TES RECORDS · CLASSEMENT MONDIAL',     subtitle: 'PRs vérifiés · Carte partageable',           footer: '🏆 Photos-preuves · Leaderboard mondial' },
      { title: 'CARTES PR PARTAGEABLES',               subtitle: 'Ton lift, ta photo, ton podium',             footer: '📸 Partage Insta en 1 tap' },
      { title: 'CLASSEMENT MONDIAL VÉRIFIÉ',           subtitle: 'Anti-triche · Photos preuves obligatoires',  footer: '🌍 Le seul leaderboard fiable' },
      { title: 'TES PRs · TOUT TON HISTORIQUE',        subtitle: 'Squat · Bench · Deadlift · HYROX · Run',     footer: 'Évolution graphique sur 12 mois' },
      { title: 'PROUVE TES RECORDS, GAGNE DES BADGES', subtitle: 'Vérification photo · Classement public',     footer: '🥇 Communauté + réputation = motivation' }
    ],
    gamification: [
      { title: "PROGRESSE EN T'AMUSANT",         subtitle: '50 niveaux · 100+ badges · Quêtes · Streaks',     footer: '🎮 Gemmes 💎 · Pièces 🪙 · Skins · Mini-jeux' },
      { title: '100+ BADGES À DÉBLOQUER',        subtitle: 'Quêtes quotidiennes · Streaks · Saisons',         footer: '🏆 Plus tu transpires, plus tu progresses' },
      { title: 'GAGNE GEMMES & PIÈCES',          subtitle: 'Achète skins, accessoires, défis',                footer: '💎 Le seul fitness vraiment fun' },
      { title: 'STREAKS QUI TE MOTIVENT',        subtitle: 'Ne casse pas ta série · Récompenses tous les 7j', footer: '🔥 100 jours = badge légendaire' },
      { title: 'NIVEAUX · SAISONS · MINI-JEUX',  subtitle: 'Le sport comme un RPG',                           footer: '🎮 Fais kiffer la séance' }
    ],
    cta: [
      { title: 'DÉMARRE GRATUITEMENT',           subtitle: '+ 7 jours PRO offerts · 1000 gemmes bonus',    footer: '🚀 Sans CB · Annulable à tout moment' },
      { title: 'ESSAIE 7 JOURS PRO GRATUITS',    subtitle: 'Toutes les fonctions · Aucun engagement',      footer: '🎁 1000 gemmes bonus à l’inscription' },
      { title: 'REJOINS LA MEUTE',               subtitle: '+50 000 athlètes français motivés',            footer: '🐐 Code GOAT24 = -30%' },
      { title: 'TÉLÉCHARGE MAINTENANT',          subtitle: 'iOS · Android · Web · Apple Watch',            footer: '🚀 Démarre en 30 secondes' },
      { title: 'PASSE EN MODE GOAT',             subtitle: "Démarre l'essai PRO de 7 jours",               footer: '🎁 1000 gemmes + skin offert' }
    ]
  },
  en: {}, de: {}, it: {}, es: {}
};

/* Auto-fiche slot presets — assigns a vertical role and an optimal template per slot.
   Slot 0..7 maps directly to slide 1..8. Override stays manual after applying. */
const SLOT_PRESETS = [
  { vertical: 'hook',         template: 'hero' },
  { vertical: 'coach_ia',     template: 'feature' },
  { vertical: 'hyrox',        template: 'feature' },
  { vertical: 'motion',       template: 'hero' },
  { vertical: 'nutrition',    template: 'feature' },
  { vertical: 'prs',          template: 'proof' },
  { vertical: 'gamification', template: 'hero' },
  { vertical: 'cta',          template: 'feature' }
];
const VERTICAL_ORDER = ['hook', 'coach_ia', 'hyrox', 'motion', 'nutrition', 'prs', 'gamification', 'cta'];
const VERTICAL_LABELS = {
  generic:      'Générique',
  hook:         'Hook',
  coach_ia:     'Coach IA',
  hyrox:        'HYROX',
  motion:       '7 univers',
  nutrition:    'Nutrition',
  prs:          'PRs · Classement',
  gamification: 'Gamification',
  cta:          'Offre · CTA'
};

function poolFor(vertical, lang) {
  const langPool = (VERTICAL_POOLS[lang] && Object.keys(VERTICAL_POOLS[lang]).length)
    ? VERTICAL_POOLS[lang]
    : VERTICAL_POOLS.fr;
  return (langPool[vertical] && langPool[vertical].length)
    ? langPool[vertical]
    : (langPool.generic || VERTICAL_POOLS.fr.generic);
}

function randomEntry(used = new Set(), vertical = 'generic', lang = 'fr') {
  const list = poolFor(vertical, lang);
  const avail = list.filter(t => !used.has(t.title));
  const pick  = (avail.length ? avail : list);
  return pick[Math.floor(Math.random() * pick.length)];
}

/* ============================================================
   DOM
============================================================ */
const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const thumbs = $('thumbs');
const strip = $('strip');
const emptyState = $('emptyState');
const slideLabel = $('slideLabel');
const inputTitle = $('inputTitle');
const inputSubtitle = $('inputSubtitle');
const inputFooter = $('inputFooter');
const btnReset = $('btnReset');
const btnPrev = $('btnPrev');
const btnNext = $('btnNext');
const btnShuffle = $('btnShuffle');
const btnShuffleAll = $('btnShuffleAll');
const btnDownloadOne = $('btnDownloadOne');
const btnDownloadAll = $('btnDownloadAll');
const btnDownloadAllLangs = $('btnDownloadAllLangs');
const btnAutoFiche = $('btnAutoFiche');
const btnPreviewFiche = $('btnPreviewFiche');
const btnRetranslate = $('btnRetranslate');
const langSelect = $('langSelect');
const previewModal = $('previewModal');
const previewGrid = $('previewGrid');
const btnClosePreview = $('btnClosePreview');

/* ============================================================
   UPLOAD
============================================================ */
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(f => f.type.startsWith('image/')).slice(0, 8 - state.slides.length);
  if (!files.length) return;
  const used = new Set(state.slides.map(s => s.title));
  for (const file of files) {
    try {
      const img = await loadImage(file);
      // If a previous session left textual configs, attach them in order
      // instead of generating fresh random texts.
      if (state.pendingTexts && state.pendingTexts.length) {
        const p = state.pendingTexts.shift();
        used.add(p.title);
        state.slides.push({
          img,
          title:    p.title    || '',
          subtitle: p.subtitle || '',
          footer:   p.footer   || '',
          vertical: p.vertical || 'generic',
          template: p.template,
          badges:   Array.isArray(p.badges) ? p.badges : []
        });
      } else {
        const entry = randomEntry(used, 'generic', state.lang);
        used.add(entry.title);
        state.slides.push({ img, title: entry.title, subtitle: entry.subtitle, footer: entry.footer || '', vertical: 'generic', badges: [] });
      }
    } catch (err) { console.warn('Failed to load image', err); }
  }
  if (state.slides.length && state.currentIdx >= state.slides.length) {
    state.currentIdx = state.slides.length - 1;
  }
  refreshAll();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

btnReset.addEventListener('click', () => {
  state.slides = [];
  state.currentIdx = 0;
  state.pendingTexts = [];
  clearSavedState();
  refreshAll();
});

/* ============================================================
   THUMBS (sidebar) + STRIP (bottom)
============================================================ */
function renderThumbs() {
  thumbs.innerHTML = '';
  btnReset.classList.toggle('hidden', state.slides.length === 0);
  state.slides.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'thumb' + (i === state.currentIdx ? ' active' : '');
    el.style.backgroundImage = `url(${s.img.src})`;
    el.draggable = true;
    el.dataset.idx = i;
    el.innerHTML = `<span class="idx">${i + 1}</span><button class="del" title="Supprimer">×</button>`;
    // Read the current index from dataset at event time (not the captured i)
    // so that handlers stay correct even if the order has shifted between renders.
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('del')) return;
      selectSlide(parseInt(el.dataset.idx, 10));
    });
    el.querySelector('.del').addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      state.slides.splice(idx, 1);
      if (state.currentIdx >= state.slides.length) state.currentIdx = Math.max(0, state.slides.length - 1);
      refreshAll();
    });
    // drag reorder
    el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', el.dataset.idx));
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const to = parseInt(el.dataset.idx, 10);
      if (isNaN(from) || isNaN(to) || from === to) return;
      const [moved] = state.slides.splice(from, 1);
      state.slides.splice(to, 0, moved);
      state.currentIdx = to;
      refreshAll();
    });
    thumbs.appendChild(el);
  });
}

function renderStrip() {
  strip.innerHTML = '';
  state.slides.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'mini' + (i === state.currentIdx ? ' active' : '');
    el.innerHTML = `<span class="n">${i + 1}</span>`;
    const mini = document.createElement('img');
    mini.src = s.img.src;
    el.appendChild(mini);
    el.addEventListener('click', () => selectSlide(i));
    strip.appendChild(el);
  });
}

function selectSlide(i) {
  state.currentIdx = i;
  refreshAll();
}

/* ============================================================
   CONTROLS
============================================================ */
document.querySelectorAll('.fmt').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.fmt').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.format = b.dataset.fmt;
    render();
  });
});

document.querySelectorAll('.seg').forEach(group => {
  group.querySelectorAll('.seg-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.seg-opt').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const g = group.dataset.group;
      const v = btn.dataset.val;
      state[g] = v;
      // Template is also per-slide so auto-fiche overrides survive global changes.
      if (g === 'template' && state.slides[state.currentIdx]) {
        state.slides[state.currentIdx].template = v;
      }
      render();
      renderStrip();
    });
  });
});

['colorBg','color1','color2'].forEach((id, i) => {
  $(id).addEventListener('input', (e) => {
    state.colors[['bg','c1','c2'][i]] = e.target.value;
    render();
  });
});

inputTitle.addEventListener('input', (e) => {
  if (!state.slides.length) return;
  state.slides[state.currentIdx].title = e.target.value;
  renderDebounced();
});
inputSubtitle.addEventListener('input', (e) => {
  if (!state.slides.length) return;
  state.slides[state.currentIdx].subtitle = e.target.value;
  renderDebounced();
});
inputFooter.addEventListener('input', (e) => {
  if (!state.slides.length) return;
  state.slides[state.currentIdx].footer = e.target.value;
  renderDebounced();
});

btnShuffle.addEventListener('click', () => {
  if (!state.slides.length) return;
  const cur = state.slides[state.currentIdx];
  const used = new Set(state.slides.map(s => s.title));
  used.delete(cur.title);
  const e = randomEntry(used, cur.vertical || 'generic', state.lang);
  cur.title = e.title;
  cur.subtitle = e.subtitle;
  cur.footer = e.footer || '';
  syncInputs();
  render();
});
function reshuffleAllSlidesForLang(lang) {
  const used = new Set();
  state.slides.forEach(s => {
    const e = randomEntry(used, s.vertical || 'generic', lang);
    s.title = e.title;
    s.subtitle = e.subtitle;
    s.footer = e.footer || '';
    used.add(e.title);
  });
}

btnShuffleAll.addEventListener('click', () => {
  reshuffleAllSlidesForLang(state.lang);
  syncInputs();
  render();
});

/* Badge toggles — clicking a preset adds/removes a badge on the current slide.
   Capped at 3 badges per slide. */
document.querySelectorAll('.badge-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const slide = state.slides[state.currentIdx];
    if (!slide) return;
    if (!slide.badges) slide.badges = [];
    const text  = btn.dataset.text;
    const icon  = btn.dataset.icon;
    const color = btn.dataset.color;
    const idx = slide.badges.findIndex(b => b.text === text);
    if (idx >= 0) {
      slide.badges.splice(idx, 1);
    } else if (slide.badges.length < 3) {
      slide.badges.push({ text, icon, color });
    } else {
      return; // cap reached, ignore click
    }
    syncBadgeButtons();
    render();
  });
});

function syncBadgeButtons() {
  const slide = state.slides[state.currentIdx];
  const active = new Set((slide && slide.badges) ? slide.badges.map(b => b.text) : []);
  const atCap = !!slide && slide.badges && slide.badges.length >= 3;
  document.querySelectorAll('.badge-toggle').forEach(btn => {
    const isActive = active.has(btn.dataset.text);
    btn.classList.toggle('active', isActive);
    btn.disabled = !slide || (!isActive && atCap);
  });
}

btnPrev.addEventListener('click', () => { if (state.currentIdx > 0) selectSlide(state.currentIdx - 1); });
btnNext.addEventListener('click', () => { if (state.currentIdx < state.slides.length - 1) selectSlide(state.currentIdx + 1); });

/* Language switch — only updates state.lang. Existing slide texts are preserved
   so the user does not lose manual edits. The dedicated "Retraduire" button is
   what regenerates all slide texts in the active language. */
langSelect.addEventListener('change', (e) => {
  state.lang = e.target.value;
  scheduleSave();
});

btnRetranslate.addEventListener('click', () => {
  if (!state.slides.length) return;
  reshuffleAllSlidesForLang(state.lang);
  syncInputs();
  render();
});

/* Mosaic preview — renders all slides at half-Play-Store resolution in a 2×4
   grid so the user can sanity-check the narrative coherence at a glance.
   Renders are sequential (yields between slides) to avoid blocking the UI. */
btnPreviewFiche.addEventListener('click', async () => {
  if (!state.slides.length) return;
  previewModal.classList.remove('hidden');
  previewGrid.innerHTML = '';
  const W = 540, H = 960;  // half of Play Store 1080×1920
  const originalFmt = state.format;
  state.format = 'play';
  for (let i = 0; i < state.slides.length; i++) {
    const cell = document.createElement('div');
    cell.className = 'preview-cell';
    const can = document.createElement('canvas');
    can.width = W;
    can.height = H;
    cell.appendChild(can);
    const cur = state.slides[i];
    const labelText = (cur.vertical && cur.vertical !== 'generic')
      ? `${i + 1} · ${VERTICAL_LABELS[cur.vertical] || cur.vertical}`
      : `${i + 1}`;
    const label = document.createElement('span');
    label.className = 'pc-label';
    label.textContent = labelText;
    cell.appendChild(label);
    previewGrid.appendChild(cell);
    renderSlide(can.getContext('2d'), W, H, cur);
    await new Promise(r => setTimeout(r, 0));  // let the browser paint
  }
  state.format = originalFmt;
});

function closePreview() { previewModal.classList.add('hidden'); }
btnClosePreview.addEventListener('click', closePreview);
previewModal.addEventListener('click', (e) => {
  if (e.target === previewModal) closePreview();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !previewModal.classList.contains('hidden')) closePreview();
});

/* Auto-fiche: assigns the narrative role (vertical + template) and pre-fills the
   title / subtitle / footer for each slot using the optimal vertical pool entry.
   Slots beyond SLOT_PRESETS keep whatever was already there. */
btnAutoFiche.addEventListener('click', () => {
  if (!state.slides.length) return;
  const used = new Set();
  state.slides.forEach((s, i) => {
    const preset = SLOT_PRESETS[i];
    if (!preset) return;
    s.vertical = preset.vertical;
    s.template = preset.template;
    const e = randomEntry(used, preset.vertical, state.lang);
    s.title = e.title;
    s.subtitle = e.subtitle;
    s.footer = e.footer || '';
    used.add(e.title);
  });
  refreshAll();
});

document.addEventListener('keydown', (e) => {
  // Ignore typing in editable controls.
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'ArrowLeft')  { btnPrev.click(); return; }
  if (e.key === 'ArrowRight') { btnNext.click(); return; }
  // 1..8 → jump to slide
  if (/^[1-8]$/.test(e.key)) {
    const idx = parseInt(e.key, 10) - 1;
    if (idx < state.slides.length) selectSlide(idx);
    return;
  }
  // E → export current slide as PNG, A → export all as ZIP
  if (e.key === 'e' || e.key === 'E') { if (!btnDownloadOne.disabled) btnDownloadOne.click(); return; }
  if (e.key === 'a' || e.key === 'A') { if (!btnDownloadAll.disabled) btnDownloadAll.click(); return; }
});

function syncInputs() {
  const s = state.slides[state.currentIdx];
  if (!s) { inputTitle.value = ''; inputSubtitle.value = ''; inputFooter.value = ''; return; }
  inputTitle.value = s.title;
  inputSubtitle.value = s.subtitle;
  inputFooter.value = s.footer || '';
  // Reflect this slide's template (per-slide override) in the segmented control.
  const curTemplate = s.template || state.template;
  document.querySelectorAll('[data-group="template"] .seg-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.val === curTemplate);
  });
}

/* ============================================================
   REFRESH
============================================================ */
function refreshAll() {
  renderThumbs();
  renderStrip();
  syncInputs();
  syncBadgeButtons();
  const has = state.slides.length > 0;
  emptyState.classList.toggle('hidden', has);
  canvas.classList.toggle('ready', has);
  btnDownloadOne.disabled = !has;
  btnDownloadAll.disabled = !has;
  btnDownloadAllLangs.disabled = !has;
  btnAutoFiche.disabled = !has;
  btnPreviewFiche.disabled = !has;
  btnRetranslate.disabled = !has;
  btnPrev.disabled = !has || state.currentIdx === 0;
  btnNext.disabled = !has || state.currentIdx >= state.slides.length - 1;
  const cur = state.slides[state.currentIdx];
  const verticalLabel = cur && cur.vertical && cur.vertical !== 'generic'
    ? ` · ${VERTICAL_LABELS[cur.vertical] || cur.vertical}`
    : '';
  slideLabel.textContent = has
    ? `Slide ${state.currentIdx + 1} / ${state.slides.length} · ${FORMATS[state.format].label}${verticalLabel}`
    : 'Aucune image';
  render();
}

let renderTimer = null;
function renderDebounced() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 80);
}

/* ============================================================
   RENDERING ENGINE
============================================================ */
function render() {
  const fmt = FORMATS[state.format];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  if (!state.slides.length) {
    ctx.clearRect(0, 0, fmt.w, fmt.h);
    scheduleSave();
    return;
  }
  renderSlide(ctx, fmt.w, fmt.h, state.slides[state.currentIdx]);
  scheduleSave();
}

function renderSlide(c, W, H, slide) {
  drawBackground(c, W, H);
  drawGrain(c, W, H);
  // Per-slide template override falls back to the global template choice.
  const tpl = slide.template || state.template;
  if (tpl === 'hero') drawHero(c, W, H, slide);
  else if (tpl === 'feature') drawFeature(c, W, H, slide);
  else if (tpl === 'comparison') drawComparison(c, W, H, slide);
  else drawProof(c, W, H, slide);
  // Badges sit on top of everything (corners), regardless of template.
  drawBadges(c, W, H, slide);
}

/* ---- BACKGROUND ---- */
function drawBackground(c, W, H) {
  const { bg, c1, c2 } = state.colors;
  if (state.style === 'minimal') {
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    // subtle vignette
    const v = c.createRadialGradient(W/2, H/2, W*0.2, W/2, H/2, W*0.9);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  } else if (state.style === 'premium') {
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    // subtle radial glow from top
    const g = c.createRadialGradient(W/2, -H*0.1, 0, W/2, -H*0.1, H*0.9);
    g.addColorStop(0, hexA(c1, 0.22));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // thin gold accent lines (top & bottom)
    c.strokeStyle = hexA('#D4AF37', 0.35);
    c.lineWidth = Math.max(1, W / 540);
    const pad = W * 0.08;
    c.beginPath(); c.moveTo(pad, H*0.11); c.lineTo(W - pad, H*0.11); c.stroke();
    c.beginPath(); c.moveTo(pad, H*0.89); c.lineTo(W - pad, H*0.89); c.stroke();
  } else {
    // aggressive: bold radial red→orange→black
    const g = c.createRadialGradient(W/2, H*0.45, W*0.05, W/2, H*0.45, W*0.95);
    g.addColorStop(0, c1);
    g.addColorStop(0.45, c2);
    g.addColorStop(1, bg);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // dark vignette edges
    const v = c.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.65)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
}

function drawGrain(c, W, H) {
  // Sampled grain for performance. 1 dot per ~400 px area.
  const density = Math.floor((W * H) / 400);
  c.save();
  c.globalAlpha = state.style === 'minimal' ? 0.04 : 0.06;
  c.fillStyle = '#fff';
  for (let i = 0; i < density; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    c.fillRect(x, y, 1, 1);
  }
  c.restore();
}

/* ---- TEXT ---- */
function drawTitle(c, W, text, y, maxWidth) {
  const size = W * 0.08;
  c.save();
  c.font = `900 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#fff';
  // stroke/shadow for punch
  if (state.style === 'aggressive') {
    c.shadowColor = hexA(state.colors.c1, 0.7);
    c.shadowBlur = W * 0.04;
  } else {
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = W * 0.02;
    c.shadowOffsetY = W * 0.005;
  }
  const lines = wrapText(c, (text || '').toUpperCase(), maxWidth);
  const lineHeight = size * 1.05;
  const totalH = lines.length * lineHeight;
  lines.forEach((ln, i) => {
    c.fillText(ln, W/2, y - totalH/2 + lineHeight/2 + i * lineHeight);
  });
  c.restore();
  return totalH;
}

function drawSubtitle(c, W, text, y, maxWidth) {
  const size = W * 0.032;
  c.save();
  c.font = `500 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = state.style === 'premium' ? '#D4AF37' : 'rgba(255,255,255,0.88)';
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = W * 0.01;
  const lines = wrapText(c, text || '', maxWidth);
  const lineHeight = size * 1.3;
  lines.forEach((ln, i) => {
    c.fillText(ln, W/2, y + i * lineHeight);
  });
  c.restore();
}

/* Footer = 3rd line, ~60% the size of subtitle, accent color (orange/gold). */
function drawFooter(c, W, text, y, maxWidth) {
  if (!text) return;
  const size = W * 0.0192; // ~60% of subtitle (0.032)
  c.save();
  c.font = `700 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = state.style === 'premium' ? '#D4AF37' : state.colors.c2;
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = W * 0.008;
  const lines = wrapText(c, text, maxWidth);
  const lineHeight = size * 1.3;
  lines.forEach((ln, i) => {
    c.fillText(ln, W/2, y + i * lineHeight);
  });
  c.restore();
}

function wrapText(c, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ---- DEVICE FRAME ---- */
function drawDevice(c, x, y, w, h, image, opts = {}) {
  const { rotate = 0 } = opts;
  const radius = w * 0.09;
  c.save();
  c.translate(x + w/2, y + h/2);
  if (rotate) c.rotate(rotate);

  // glow behind device
  const glowSize = w * 0.25;
  c.save();
  c.shadowColor = hexA(state.colors.c1, state.style === 'minimal' ? 0.4 : 0.75);
  c.shadowBlur = glowSize;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = w * 0.02;
  c.fillStyle = '#000';
  roundRect(c, -w/2, -h/2, w, h, radius);
  c.fill();
  c.restore();

  // outer bezel
  const bezel = w * 0.018;
  c.fillStyle = '#1a1a1d';
  roundRect(c, -w/2, -h/2, w, h, radius);
  c.fill();
  // inner highlight stroke
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = Math.max(1, w * 0.002);
  roundRect(c, -w/2 + 0.5, -h/2 + 0.5, w - 1, h - 1, radius);
  c.stroke();

  // screen clip
  const innerR = radius - bezel * 0.8;
  const sx = -w/2 + bezel, sy = -h/2 + bezel;
  const sw = w - bezel * 2, sh = h - bezel * 2;
  c.save();
  roundRect(c, sx, sy, sw, sh, innerR);
  c.clip();
  // screen background
  c.fillStyle = '#000';
  c.fillRect(sx, sy, sw, sh);
  // draw user image "cover"
  drawImageCover(c, image, sx, sy, sw, sh);
  // subtle screen sheen
  const sheen = c.createLinearGradient(sx, sy, sx, sy + sh);
  sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  c.fillStyle = sheen; c.fillRect(sx, sy, sw, sh);
  c.restore();

  // dynamic island
  const islandW = w * 0.26, islandH = w * 0.045;
  c.fillStyle = '#000';
  roundRect(c, -islandW/2, -h/2 + bezel + w * 0.018, islandW, islandH, islandH / 2);
  c.fill();

  c.restore();
}

function drawImageCover(c, img, x, y, w, h) {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sw, sh, sx, sy;
  if (ir > tr) {
    sh = img.naturalHeight;
    sw = sh * tr;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / tr;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/* ---- LAYOUT HELPER ----
   Fit device into vertical band [topPct, bottomPct] of H, capped by width.
   Device aspect 9:19.5 (modern iPhone screen). */
function layoutDevice(W, H, topPct, bottomPct, maxWidthPct = 0.78) {
  const top = H * topPct;
  const bottom = H * bottomPct;
  const availH = bottom - top;
  const ASPECT = 9 / 19.5; // w/h
  let devH = availH;
  let devW = devH * ASPECT;
  const maxW = W * maxWidthPct;
  if (devW > maxW) { devW = maxW; devH = devW / ASPECT; }
  const devX = (W - devW) / 2;
  const devY = top + (availH - devH) / 2;
  return { x: devX, y: devY, w: devW, h: devH };
}

/* ---- TEMPLATES ---- */
function drawHero(c, W, H, slide) {
  // Title zone top
  drawTitle(c, W, slide.title, H * 0.10, W * 0.86);
  // Device in middle band — reserve room for subtitle + footer below
  const d = layoutDevice(W, H, 0.18, 0.86);
  drawDevice(c, d.x, d.y, d.w, d.h, slide.img);
  // Subtitle then footer
  drawSubtitle(c, W, slide.subtitle, H * 0.91, W * 0.8);
  drawFooter(c, W, slide.footer, H * 0.965, W * 0.86);
}

function drawFeature(c, W, H, slide) {
  // Title block top
  drawTitle(c, W, slide.title, H * 0.10, W * 0.88);
  // Device tilted — reserve more bottom space for callout + footer
  const d = layoutDevice(W, H, 0.18, 0.78, 0.72);
  drawDevice(c, d.x, d.y, d.w, d.h, slide.img, { rotate: -0.05 });
  // Accent callout card, then footer below
  drawCallout(c, W, H, slide.subtitle, 0.83);
  drawFooter(c, W, slide.footer, H * 0.965, W * 0.86);
}

function drawCallout(c, W, H, subtitle, yPct = 0.88) {
  const cardW = W * 0.82;
  const cardH = H * 0.075;
  const x = (W - cardW) / 2;
  const y = H * yPct;
  c.save();
  // card bg with blur-like layered fill
  c.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(c, x, y, cardW, cardH, cardH * 0.3);
  c.fill();
  c.strokeStyle = hexA(state.colors.c1, 0.7);
  c.lineWidth = Math.max(2, W / 360);
  roundRect(c, x, y, cardW, cardH, cardH * 0.3);
  c.stroke();
  // accent bar
  const barW = cardW * 0.015;
  c.fillStyle = state.colors.c1;
  roundRect(c, x + cardH * 0.25, y + cardH * 0.18, barW, cardH * 0.64, barW / 2);
  c.fill();
  // text
  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillStyle = '#fff';
  const size = W * 0.034;
  c.font = `600 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  c.fillText(subtitle || '', x + cardH * 0.7, y + cardH / 2);
  c.restore();
}

function drawProof(c, W, H, slide) {
  // Title top
  drawTitle(c, W, slide.title, H * 0.10, W * 0.86);
  // Device — reserve space for stats card + subtitle + footer at bottom
  const d = layoutDevice(W, H, 0.18, 0.78);
  drawDevice(c, d.x, d.y, d.w, d.h, slide.img);
  // Stats card, then subtitle, then footer
  drawStatsCard(c, W, H, 0.80);
  drawSubtitle(c, W, slide.subtitle, H * 0.925, W * 0.8);
  drawFooter(c, W, slide.footer, H * 0.97, W * 0.86);
}

/* Floating pill badges in the corners. Up to 3 per slide; positions cycle
   TR → BL → TL with a slight ±5° rotation. */
const BADGE_POSITIONS = ['TR', 'BL', 'TL'];

function drawBadges(c, W, H, slide) {
  if (!slide.badges || !slide.badges.length) return;
  slide.badges.slice(0, 3).forEach((b, i) => {
    drawBadge(c, W, H, b, BADGE_POSITIONS[i]);
  });
}

function drawBadge(c, W, H, badge, pos) {
  const fontSize = W * 0.028;
  c.save();
  c.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  const text = ((badge.icon || '') + ' ' + (badge.text || '')).trim();
  const textW = c.measureText(text).width;
  const padInnerX = W * 0.025;
  const padInnerY = W * 0.014;
  const bw = textW + padInnerX * 2;
  const bh = fontSize + padInnerY * 2;

  const padX = W * 0.05;
  const padY = H * 0.04;
  let cx, cy, rot;
  if (pos === 'TR')      { cx = W - padX - bw / 2; cy = padY + bh / 2;     rot =  0.087; }
  else if (pos === 'BL') { cx = padX + bw / 2;     cy = H - padY - bh / 2; rot = -0.087; }
  else                   { cx = padX + bw / 2;     cy = padY + bh / 2;     rot = -0.087; }

  c.translate(cx, cy);
  c.rotate(rot);

  const color = badge.color || state.colors.c2;
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = W * 0.018;
  c.shadowOffsetY = W * 0.004;
  c.fillStyle = 'rgba(0,0,0,0.78)';
  roundRect(c, -bw / 2, -bh / 2, bw, bh, bh * 0.45);
  c.fill();

  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, W / 360);
  roundRect(c, -bw / 2, -bh / 2, bw, bh, bh * 0.45);
  c.stroke();

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#fff';
  c.fillText(text, 0, 0);
  c.restore();
}

/* Comparison template — 2 columns "WITH" vs "WITHOUT GOAT FUEL".
   Renders the title, two cards with bullets, then subtitle + footer.
   The user's uploaded image is intentionally NOT shown — this is a text card. */
function drawComparison(c, W, H, slide) {
  drawTitle(c, W, slide.title, H * 0.10, W * 0.88);

  const cardY = H * 0.20;
  const cardH = H * 0.62;
  const sidePad = W * 0.05;
  const colGap  = W * 0.04;
  const colW = (W - sidePad * 2 - colGap) / 2;
  const leftX  = sidePad;
  const rightX = sidePad + colW + colGap;

  drawCompCard(c, leftX,  cardY, colW, cardH, true,  slide);
  drawCompCard(c, rightX, cardY, colW, cardH, false, slide);

  drawSubtitle(c, W, slide.subtitle, H * 0.875, W * 0.86);
  drawFooter(c, W, slide.footer, H * 0.94, W * 0.86);
}

function drawCompCard(c, x, y, w, h, positive, slide) {
  const r = w * 0.08;
  const accent = positive ? '#34C759' : '#8E8E93';
  const stroke = positive ? state.colors.c2 : '#3A3A42';
  c.save();

  c.fillStyle = positive ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.04)';
  roundRect(c, x, y, w, h, r);
  c.fill();
  c.strokeStyle = stroke;
  c.lineWidth = Math.max(2, w / 80);
  roundRect(c, x, y, w, h, r);
  c.stroke();

  const headerH = h * 0.16;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${w * 0.115}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  c.fillStyle = accent;
  c.fillText(positive ? 'AVEC' : 'SANS', x + w / 2, y + headerH * 0.42);
  c.font = `800 ${w * 0.085}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  c.fillStyle = '#fff';
  c.fillText('GOAT FUEL', x + w / 2, y + headerH * 0.88);

  c.strokeStyle = 'rgba(255,255,255,0.10)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + w * 0.12, y + headerH + h * 0.03);
  c.lineTo(x + w * 0.88, y + headerH + h * 0.03);
  c.stroke();

  const bullets = positive
    ? (slide.bulletsWith    || ['1 app pour tout', 'Coach IA 24/7', 'Plans HYROX & Run', '28× moins cher'])
    : (slide.bulletsWithout || ['4 abonnements', 'Coach humain coûteux', 'Plans génériques PDF', 'Tracking dispersé']);
  const icon = positive ? '✅' : '❌';
  const bulletStartY = y + headerH + h * 0.08;
  const bulletAreaH  = h - (headerH + h * 0.08) - h * 0.04;
  const bulletH = bulletAreaH / bullets.length;

  c.textAlign  = 'left';
  c.textBaseline = 'middle';
  c.font = `600 ${w * 0.082}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  c.fillStyle = positive ? '#fff' : 'rgba(255,255,255,0.55)';
  bullets.forEach((b, i) => {
    const by = bulletStartY + i * bulletH + bulletH / 2;
    c.fillText(`${icon}  ${b}`, x + w * 0.08, by);
  });

  c.restore();
}

function drawStatsCard(c, W, H, yPct = 0.855) {
  const cardW = W * 0.78;
  const cardH = H * 0.075;
  const x = (W - cardW) / 2;
  const y = H * yPct;
  c.save();
  c.fillStyle = 'rgba(15,15,17,0.92)';
  roundRect(c, x, y, cardW, cardH, cardH * 0.22);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 2;
  roundRect(c, x, y, cardW, cardH, cardH * 0.22);
  c.stroke();

  // 3 columns of fake stats
  const stats = [
    ['+128%', 'PROGRESSION'],
    ['47', 'SÉANCES'],
    ['LVL 12', 'NIVEAU GOAT']
  ];
  const colW = cardW / 3;
  const numSize = W * 0.042;
  const labelSize = W * 0.018;
  stats.forEach((s, i) => {
    const cx = x + colW * i + colW / 2;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // number
    c.font = `900 ${numSize}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    c.fillStyle = i === 0 ? state.colors.c1 : (i === 2 ? state.colors.c2 : '#fff');
    c.fillText(s[0], cx, y + cardH * 0.38);
    // label
    c.font = `700 ${labelSize}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillText(s[1], cx, y + cardH * 0.72);
  });
  // separators
  c.strokeStyle = 'rgba(255,255,255,0.06)';
  c.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    c.beginPath();
    c.moveTo(x + colW * i, y + cardH * 0.25);
    c.lineTo(x + colW * i, y + cardH * 0.75);
    c.stroke();
  }
  c.restore();
}

/* ---- UTIL ---- */
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ============================================================
   EXPORT — PNG individuel
============================================================ */
btnDownloadOne.addEventListener('click', async () => {
  if (!state.slides.length) return;
  btnDownloadOne.disabled = true;
  btnDownloadOne.textContent = 'Génération…';
  try {
    const blob = await exportSlideToBlob(state.currentIdx, state.format);
    const name = `goatfuel_${state.format === 'play' ? 'playstore' : 'appstore'}_${pad(state.currentIdx + 1)}.png`;
    downloadBlob(blob, name);
  } finally {
    btnDownloadOne.disabled = false;
    btnDownloadOne.textContent = 'PNG courante';
  }
});

btnDownloadAll.addEventListener('click', async () => {
  if (!state.slides.length) return;
  btnDownloadAll.disabled = true;
  const originalLabel = 'Télécharger tout .zip';
  try {
    const files = [];
    const total = state.slides.length * 2;
    let done = 0;
    for (const fmt of ['play', 'app']) {
      for (let i = 0; i < state.slides.length; i++) {
        btnDownloadAll.textContent = `Export ${++done}/${total}…`;
        const blob = await exportSlideToBlob(i, fmt);
        const name = `goatfuel_${fmt === 'play' ? 'playstore' : 'appstore'}_${pad(i + 1)}.png`;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        files.push({ name, bytes });
        await new Promise(r => setTimeout(r, 0));
      }
    }
    btnDownloadAll.textContent = 'Zippage…';
    const zipBlob = buildZip(files);
    downloadBlob(zipBlob, `goatfuel_screenshots_${Date.now()}.zip`);
  } finally {
    btnDownloadAll.disabled = false;
    btnDownloadAll.textContent = originalLabel;
  }
});

async function exportSlideToBlob(idx, format) {
  return exportSlideToBlobFor(state.slides, idx, format);
}

async function exportSlideToBlobFor(slides, idx, format) {
  const fmt = FORMATS[format];
  const off = document.createElement('canvas');
  off.width = fmt.w;
  off.height = fmt.h;
  const c = off.getContext('2d');
  const originalFmt = state.format;
  state.format = format;
  renderSlide(c, fmt.w, fmt.h, slides[idx]);
  state.format = originalFmt;
  return new Promise(resolve => off.toBlob(resolve, 'image/png'));
}

/* Languages with at least one filled vertical (FR is always available). */
function availableLanguages() {
  return ['fr', 'en', 'de', 'it', 'es'].filter(l =>
    l === 'fr' || (VERTICAL_POOLS[l] && Object.keys(VERTICAL_POOLS[l]).length > 0)
  );
}

/* Build a virtual snapshot of the slides re-randomised for the target lang.
   Manual edits made to the active language are NOT propagated — for non-active
   languages the texts come from the lang's vertical pool (or FR as fallback). */
function virtualSlidesForLang(lang) {
  if (lang === state.lang) return state.slides;
  const used = new Set();
  return state.slides.map(s => {
    const e = randomEntry(used, s.vertical || 'generic', lang);
    used.add(e.title);
    return { ...s, title: e.title, subtitle: e.subtitle, footer: e.footer || '' };
  });
}

btnDownloadAllLangs.addEventListener('click', async () => {
  if (!state.slides.length) return;
  btnDownloadAllLangs.disabled = true;
  const originalLabel = '🌍 Toutes langues';
  try {
    const langs = availableLanguages();
    const files = [];
    let done = 0;
    const total = langs.length * state.slides.length * 2;
    for (const lang of langs) {
      const snapshot = virtualSlidesForLang(lang);
      for (const fmt of ['play', 'app']) {
        for (let i = 0; i < snapshot.length; i++) {
          btnDownloadAllLangs.textContent = `Export ${++done}/${total}…`;
          const blob = await exportSlideToBlobFor(snapshot, i, fmt);
          const name = `${lang}/goatfuel_${fmt === 'play' ? 'playstore' : 'appstore'}_${pad(i + 1)}.png`;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          files.push({ name, bytes });
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }
    btnDownloadAllLangs.textContent = 'Zippage…';
    const zipBlob = buildZip(files);
    downloadBlob(zipBlob, `goatfuel_all_langs_${Date.now()}.zip`);
  } finally {
    btnDownloadAllLangs.disabled = false;
    btnDownloadAllLangs.textContent = originalLabel;
  }
});

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pad(n) { return String(n).padStart(2, '0'); }

/* ============================================================
   ZIP (STORE method, no compression) — minimal inline
============================================================ */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function strToBytes(s) { return new TextEncoder().encode(s); }

function buildZip(files) {
  // files: [{ name: string, bytes: Uint8Array }]
  const parts = [];
  const central = [];
  let offset = 0;

  // DOS time/date = 2026-01-01 00:00
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const f of files) {
    const nameBytes = strToBytes(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;

    // Local file header
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lfh.buffer);
    lv.setUint32(0, 0x04034b50, true); // sig
    lv.setUint16(4, 20, true);         // version
    lv.setUint16(6, 0, true);          // flags
    lv.setUint16(8, 0, true);          // method = 0 STORE
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);      // compressed = uncompressed for STORE
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);

    parts.push(lfh, f.bytes);

    // Central directory entry
    const cdh = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);         // version made by
    cv.setUint16(6, 20, true);         // version needed
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);         // extra
    cv.setUint16(32, 0, true);         // comment
    cv.setUint16(34, 0, true);         // disk
    cv.setUint16(36, 0, true);         // int attrs
    cv.setUint32(38, 0, true);         // ext attrs
    cv.setUint32(42, offset, true);    // local header offset
    cdh.set(nameBytes, 46);
    central.push(cdh);

    offset += lfh.length + f.bytes.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  central.forEach(c => cdSize += c.length);

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  ev.setUint16(20, 0, true);

  return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
}

/* ============================================================
   PERSISTENCE — localStorage. Images are NOT stored (too heavy).
   On reload, the saved texts/configs are kept in pendingTexts and consumed
   when the user re-uploads images.
============================================================ */
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 400);
}

function saveState() {
  if (!INITIALIZED) return;  // do not overwrite a saved session before init resolved
  try {
    // Build the persisted slot list = current slides + leftover pendingTexts
    // (in case the user has only re-uploaded part of a previous session).
    const persisted = state.slides.map(s => ({
      title:    s.title,
      subtitle: s.subtitle,
      footer:   s.footer || '',
      vertical: s.vertical || 'generic',
      template: s.template,
      badges:   s.badges || []
    }));
    if (state.pendingTexts && state.pendingTexts.length) {
      persisted.push(...state.pendingTexts);
    }
    const data = {
      schema:       SCHEMA_VERSION,
      pendingTexts: persisted.slice(0, 8),
      format:       state.format,
      template:     state.template,
      style:        state.style,
      colors:       state.colors,
      lang:         state.lang
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* quota or disabled storage — silent */ }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.schema !== SCHEMA_VERSION) return null;
    return data;
  } catch (e) { return null; }
}

function clearSavedState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

function applySavedState(saved) {
  if (saved.format) state.format = saved.format;
  if (saved.template) state.template = saved.template;
  if (saved.style) state.style = saved.style;
  if (saved.colors) state.colors = saved.colors;
  if (saved.lang)  state.lang  = saved.lang;
  state.pendingTexts = (saved.pendingTexts || []).slice(0, 8);
  // Reflect in UI controls.
  document.querySelectorAll('.fmt').forEach(b => b.classList.toggle('active', b.dataset.fmt === state.format));
  document.querySelectorAll('[data-group="template"] .seg-opt').forEach(b => b.classList.toggle('active', b.dataset.val === state.template));
  document.querySelectorAll('[data-group="style"] .seg-opt').forEach(b => b.classList.toggle('active', b.dataset.val === state.style));
  $('colorBg').value = state.colors.bg || '#0A0A0A';
  $('color1').value  = state.colors.c1 || '#FF3B30';
  $('color2').value  = state.colors.c2 || '#FF9500';
  langSelect.value = state.lang;
}

/* ============================================================
   INIT
============================================================ */
langSelect.value = state.lang;

const saved = loadSavedState();
const hasResumable = saved && (
  (saved.pendingTexts && saved.pendingTexts.length) ||
  saved.format !== 'play' || saved.template !== 'hero' || saved.style !== 'aggressive' ||
  saved.lang !== 'fr'
);
if (hasResumable) {
  const banner   = $('resumeBanner');
  const yesBtn   = $('btnResumeYes');
  const noBtn    = $('btnResumeNo');
  const slotInfo = $('resumeSlots');
  const n = (saved.pendingTexts || []).length;
  slotInfo.textContent = n ? ` · ${n} slot${n > 1 ? 's' : ''} mémorisé${n > 1 ? 's' : ''}` : '';
  banner.classList.remove('hidden');
  yesBtn.addEventListener('click', () => {
    applySavedState(saved);
    banner.classList.add('hidden');
    INITIALIZED = true;
    refreshAll();
  });
  noBtn.addEventListener('click', () => {
    clearSavedState();
    banner.classList.add('hidden');
    INITIALIZED = true;
  });
  refreshAll();
} else {
  refreshAll();
  INITIALIZED = true;
}

})();
