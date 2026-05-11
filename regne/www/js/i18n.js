// i18n.js — Système de traduction FR/EN.
// Pattern : t('key', { params }) résout la clé dans le dictionnaire de la locale courante.
// Fallback : si une clé manque en EN, on retombe sur FR.

import { Storage } from './storage.js';

const LOCALES = {
  fr: {
    // === GLOBAL ===
    app_title: 'World State Simulator',
    app_subtitle: 'Le sort d\'une nation est entre tes mains.',
    yes: 'Oui', no: 'Non',
    cancel: 'Annuler', confirm: 'Confirmer', close: 'Fermer', back: '← Retour',
    save: 'Sauvegarder', delete: 'Supprimer', loading: 'Chargement…',

    // === ACCUEIL ===
    home_quickstart: '⚡ COMMENCER VITE',
    home_quickstart_sub: 'Un scénario prêt à jouer en 1 clic',
    home_custom: '🎲 NOUVEAU RÈGNE PERSONNALISÉ',
    home_custom_sub: 'Génère une nation unique ou configure tout',
    home_choose_genre: 'CHOISIR UN UNIVERS',
    home_choose_genre_desc: '14 genres : cyberpunk, médiéval, sci-fi, fantasy, contemporain… L\'IA invente le pays',
    home_configure: 'JE CONFIGURE TOUT',
    home_configure_desc: 'Nom, drapeau, époque, titre, difficulté + 4 traits de personnalité',
    home_recent: '📜 TES DERNIERS RÈGNES',
    home_features: '🎨 CE QUE TU PEUX FAIRE',
    home_relics: '🜲 RELIQUES',
    home_modes: '🎮 MODE DE JEU',
    home_modes_sub: 'Choix appliqué à la prochaine partie',
    home_relics_unlock_first: 'Termine ton premier règne pour débloquer tes premières reliques',
    home_relics_status: '{unlocked}/{total} débloquées · {active}/{max} actives',

    footer_profile: '👤 Profil',
    footer_history: '📜 Anciens règnes',
    footer_settings: '⚙ Paramètres',

    // === GAME ===
    btn_abandon: 'Abandonner ce règne',
    btn_archives: 'Archives',
    btn_settings_short: 'Paramètres',
    btn_tech: 'Arbre de développement',
    free_choice_label: '✍ Écrire ma propre décision',
    free_choice_hint: '(évaluée par l\'IA)',
    free_choice_placeholder: 'Décrivez votre décision en quelques phrases…',
    free_choice_submit: 'SOUMETTRE',
    free_choice_too_short: 'Décrivez votre décision en au moins 10 caractères.',
    char_count: '{n} / 280',
    decision_in_progress: 'Décision en cours…',
    evaluation: 'ÉVALUATION…',
    event_loading: 'L\'événement se prépare…',
    advisor_legendary: '★ légendaire',
    advisor_loyalty_low: '⚠ loyauté faible',

    // === GAUGES ===
    gauge_economy: 'Économie',
    gauge_military: 'Armée',
    gauge_support: 'Soutien populaire',
    gauge_diplomacy: 'Diplomatie',
    gauge_treasury: 'Trésor',

    // === GAMEOVER ===
    gameover_legendary_title: 'UN RÈGNE LÉGENDAIRE',
    gameover_legendary_sub: 'L\'Histoire retiendra ce nom pour toujours',
    gameover_great_title: 'UN RÈGNE GLORIEUX',
    gameover_great_sub: 'Vous laissez une nation forte et prospère',
    gameover_good_title: 'UN BON RÈGNE',
    gameover_good_sub: 'Vous avez tenu votre promesse',
    gameover_neutral_title: 'UN RÈGNE ORDINAIRE',
    gameover_neutral_sub: 'Ni gloire, ni infamie',
    gameover_bad_title: 'UN MAUVAIS RÈGNE',
    gameover_bad_sub: 'Le pays paye les conséquences',
    gameover_catastrophic_title: 'RÈGNE ÉPHÉMÈRE',
    gameover_catastrophic_sub: 'L\'Histoire est sans pitié',
    gameover_duration: 'Durée',
    gameover_score: 'Score',
    gameover_verdict: 'Verdict',
    gameover_epitaph: 'L\'ÉPITAPHE',
    gameover_btn_new: '🎲 NOUVELLE DYNASTIE',
    gameover_btn_lineage: '🪶 CONTINUER LA LIGNÉE',
    gameover_btn_newgame_plus: '⚡ NEWGAME+ (+5 par jauge)',
    gameover_btn_share: '🔗 PARTAGER MON RÈGNE',
    gameover_btn_archives: '📜 Archives',
    gameover_btn_epopee: '📜 GÉNÉRER L\'ÉPOPÉE',
    gameover_unlocked_relics: 'RELIQUES DÉBLOQUÉES',
    gameover_dynasty: 'LIGNÉE — {name}',
    gameover_traits_drift: 'DÉRIVE IDÉOLOGIQUE (initial → final)',
    gameover_evolution: 'ÉVOLUTION DES JAUGES ({n} points)',
    gameover_political_portrait: 'PORTRAIT POLITIQUE',
    gameover_unlocked_achievements: 'RÉALISATIONS DÉBLOQUÉES',
    gameover_prophecies: '📖 Prophéties de l\'Oracle ({fulfilled}/{total} réalisées)',
    gameover_prophecy_fulfilled: 'réalisée',
    gameover_prophecy_avoided: 'évitée',
    gameover_decisions_tree: '📊 Arbre des décisions clés ({n})',
    gameover_relics_hint: 'Tu peux activer jusqu\'à 2 reliques avant ton prochain règne.',
    gameover_demo_warning: '⚠ Épitaphe générée en mode démo',

    // === ENDING TYPES (pour formatEndingType) ===
    ending_legendary: '✨ LÉGENDAIRE',
    ending_great: '👑 GLORIEUX',
    ending_good: '⚔ BON',
    ending_neutral: '⚖ NEUTRE',
    ending_bad: '⛓ MAUVAIS',
    ending_catastrophic: '💀 CATASTROPHIQUE',

    // === SETTINGS ===
    settings_title: '⚙ PARAMÈTRES',
    settings_provider: 'FOURNISSEUR IA',
    settings_apikey: 'CLÉ API',
    settings_apikey_get: '🔑 Obtenir une clé API {provider}',
    settings_apikey_test: '🧪 Tester la connexion',
    settings_apikey_local: 'Stockée localement uniquement (localStorage). Jamais envoyée ailleurs qu\'au fournisseur choisi.',
    settings_model: 'MODÈLE — 3 tiers rapides',
    settings_streaming: 'STREAMING',
    settings_streaming_label: 'Affichage progressif (texte qui apparaît au fur et à mesure)',
    settings_a11y: 'CONFORT & ACCESSIBILITÉ',
    settings_audio: '🔊 Audio (sons synthétiques)',
    settings_audio_desc: 'Court clic à chaque décision, fanfare aux achievements, descente grave en fin de règne. Aucun fichier audio externe.',
    settings_reading: '📖 Mode lecture (texte agrandi)',
    settings_reading_desc: 'Augmente la taille de la narration et de l\'épitaphe à 19px.',
    settings_contrast: '🌗 Contraste élevé',
    settings_contrast_desc: 'Palette claire (fond beige, texte sombre) pour une meilleure lisibilité.',
    settings_language: '🌐 Langue / Language',
    settings_language_desc: 'Bascule l\'interface entre français et anglais.',
    settings_save: 'Sauvegarder',
    settings_saved: '✅ Paramètres sauvegardés',

    // === PROFIL ===
    profile_title: '📜 PROFIL DE LÉGAT',
    profile_next: 'Prochain palier : {label}',
    profile_max: 'Palier maximum atteint.',
    profile_streak: '🔥 {n} jours',
    profile_total_games: 'Règnes terminés',
    profile_total_turns: 'Tours cumulés',
    profile_best_score: 'Meilleur score',
    profile_longest_reign: 'Plus long règne',
    profile_genres: 'Genres explorés',
    profile_tokens: 'Tokens IA utilisés',
    profile_relics: 'RELIQUES ({unlocked}/{total})',
    profile_achievements: 'ACHIEVEMENTS ({unlocked}/{total})',
    profile_endings: 'CAUSES DE FIN (camembert)',
    profile_dynasties: 'DYNASTIES LES PLUS LONGUES',
    profile_titles: 'PROGRESSION DES TITRES ({cur}/{total})',
    profile_no_games: 'Aucune partie terminée à ce jour.',
    profile_current_reign: 'RÈGNE EN COURS — {name}',

    // === MODES ===
    mode_classic: 'Classique',
    mode_classic_desc: 'Mode standard. Game over si une jauge atteint 0 ou 100.',
    mode_heritage: 'Héritage',
    mode_heritage_desc: '3 crises dynastiques au lieu du game over immédiat. Score ×1.5 si 0 crise.',
    mode_chronicle: 'Chronique',
    mode_chronicle_desc: 'Pas de fin par jauges (clampées 5..95). Une nouvelle ère tous les 25 tours.',

    // === TECH TREE ===
    tech_title: '🔬 ARBRE DE DÉVELOPPEMENT',
    tech_treasury: 'Trésor disponible : {n}/100',
    tech_intro: 'Investis ton trésor pour débloquer des paliers permanents. Chaque palier applique son bonus tous les N tours.',
    tech_unlock: 'Investir',
    tech_every: 'Tous les {n} tours',
    tech_unlocked: '✓ Débloqué',
    tech_unlocked_toast: '🔬 {label} débloqué !',
    tech_no_treasury: 'Trésor insuffisant — {n} requis.',
    tech_maxed: 'Branche déjà au maximum.',
    tech_branch_economy: 'Économie',
    tech_branch_military: 'Militaire',
    tech_branch_society: 'Société',
    tech_branch_innovation: 'Innovation',

    // === DIPLOMATIE / VOISINS ===
    attitude_ally: 'allié indéfectible',
    attitude_friend: 'amical',
    attitude_neutral: 'neutre',
    attitude_tense: 'tendu',
    attitude_hostile: 'hostile',

    // === MARCHÉ ===
    market_label: 'Marché mondial',

    // === MISC ===
    new_game: '🌐 NOUVEAU RÈGNE',
    api_key_warning: 'Configure une clé API pour activer la narration IA.',
    welcome_first_run: '👋 Bienvenue dans World State Simulator',
    crisis_dynastic: '⚡ CRISE DYNASTIQUE — {label}. {n} survivances restantes.',
    era_transition: '🏛 ÈRE {n} — votre chronique se prolonge.',
    drift_toast: '📈 Votre règne devient {label}.',

    // === RELICS ===
    relic_iron_crown_name: 'Couronne de Fer',
    relic_iron_crown_desc: '+5 Armée au départ',
    relic_golden_quill_name: 'Plume d\'Or',
    relic_golden_quill_desc: '+5 Économie au départ',
    relic_mercy_tome_name: 'Tome de Clémence',
    relic_mercy_tome_desc: 'Les jauges ne tombent pas sous 5',
    relic_war_banner_name: 'Bannière de Guerre',
    relic_war_banner_desc: 'Armée commence à 80',
    relic_traders_ring_name: 'Anneau du Marchand',
    relic_traders_ring_desc: 'Trésor commence à 75',
    relic_shadow_crown_name: 'Couronne de l\'Ombre',
    relic_shadow_crown_desc: 'Bonus +3 sur toutes les jauges',
    relic_eternal_flame_name: 'Flamme Éternelle',
    relic_eternal_flame_desc: 'Les fins Légendaires donnent ×4 au lieu de ×3',
    relic_black_seal_name: 'Sceau Noir',
    relic_black_seal_desc: 'Bonus +10 partout (déblocage rare)',

    // === ONBOARDING (premier lancement) ===
    onb_skip: 'Passer',
    onb_back: 'Précédent',
    onb_next: 'Suivant',
    onb_start: 'Commencer mon règne',
    onb_step: 'Étape {n}/{total}',
    onb_1_title: 'Bienvenue dans World State Simulator',
    onb_1_body: 'Vous êtes à la tête d\'une nation. Chaque décision façonne son destin. L\'histoire est unique à chaque partie — racontée par une IA.',
    onb_2_title: '5 jauges, 5 leviers de pouvoir',
    onb_2_body: 'Économie · Armée · Soutien populaire · Diplomatie · Trésor. Maintenez-les entre 0 et 100. Si l\'une touche un extrême, votre règne s\'effondre.',
    onb_3_title: 'Choisir, c\'est régner',
    onb_3_body: 'Chaque tour, un événement vous force à trancher. 4 choix proposés — ou rédigez votre propre décision, l\'IA en jugera les conséquences.',
    onb_4_title: 'Bâtir une légende',
    onb_4_body: 'Reliques débloquées, dynasties qui se prolongent, titres cumulés, scénarios historiques, arbre R&D, voisins diplomatiques. Plus vous jouez, plus l\'expérience s\'enrichit.',
    onb_5_title: 'Prêt à régner ?',
    onb_5_body: 'Configurez une clé API IA gratuite (OpenRouter Gemini) pour la narration immersive — ou jouez en mode démo offline. Tout est dans Paramètres.',

    // AI prompts language directive
    ai_lang_directive: 'Réponds en français.'
  },

  en: {
    // === GLOBAL ===
    app_title: 'World State Simulator',
    app_subtitle: 'The fate of a nation rests in your hands.',
    yes: 'Yes', no: 'No',
    cancel: 'Cancel', confirm: 'Confirm', close: 'Close', back: '← Back',
    save: 'Save', delete: 'Delete', loading: 'Loading…',

    // === HOME ===
    home_quickstart: '⚡ QUICK START',
    home_quickstart_sub: 'A scenario ready to play in one click',
    home_custom: '🎲 NEW CUSTOM REIGN',
    home_custom_sub: 'Generate a unique nation or configure everything',
    home_choose_genre: 'CHOOSE A UNIVERSE',
    home_choose_genre_desc: '14 genres: cyberpunk, medieval, sci-fi, fantasy, contemporary… The AI invents the country',
    home_configure: 'I CONFIGURE EVERYTHING',
    home_configure_desc: 'Name, flag, era, title, difficulty + 4 personality traits',
    home_recent: '📜 YOUR LATEST REIGNS',
    home_features: '🎨 WHAT YOU CAN DO',
    home_relics: '🜲 RELICS',
    home_modes: '🎮 GAME MODE',
    home_modes_sub: 'Choice applied to the next game',
    home_relics_unlock_first: 'Complete your first reign to unlock your first relics',
    home_relics_status: '{unlocked}/{total} unlocked · {active}/{max} active',

    footer_profile: '👤 Profile',
    footer_history: '📜 Past reigns',
    footer_settings: '⚙ Settings',

    // === GAME ===
    btn_abandon: 'Abandon this reign',
    btn_archives: 'Archives',
    btn_settings_short: 'Settings',
    btn_tech: 'Development tree',
    free_choice_label: '✍ Write my own decision',
    free_choice_hint: '(evaluated by AI)',
    free_choice_placeholder: 'Describe your decision in a few sentences…',
    free_choice_submit: 'SUBMIT',
    free_choice_too_short: 'Describe your decision in at least 10 characters.',
    char_count: '{n} / 280',
    decision_in_progress: 'Decision in progress…',
    evaluation: 'EVALUATING…',
    event_loading: 'The event is unfolding…',
    advisor_legendary: '★ legendary',
    advisor_loyalty_low: '⚠ low loyalty',

    // === GAUGES ===
    gauge_economy: 'Economy',
    gauge_military: 'Military',
    gauge_support: 'Public Support',
    gauge_diplomacy: 'Diplomacy',
    gauge_treasury: 'Treasury',

    // === GAMEOVER ===
    gameover_legendary_title: 'A LEGENDARY REIGN',
    gameover_legendary_sub: 'History will remember this name forever',
    gameover_great_title: 'A GLORIOUS REIGN',
    gameover_great_sub: 'You leave behind a strong and prosperous nation',
    gameover_good_title: 'A GOOD REIGN',
    gameover_good_sub: 'You kept your promise',
    gameover_neutral_title: 'AN ORDINARY REIGN',
    gameover_neutral_sub: 'Neither glory nor infamy',
    gameover_bad_title: 'A POOR REIGN',
    gameover_bad_sub: 'The country pays the price',
    gameover_catastrophic_title: 'EPHEMERAL REIGN',
    gameover_catastrophic_sub: 'History is merciless',
    gameover_duration: 'Duration',
    gameover_score: 'Score',
    gameover_verdict: 'Verdict',
    gameover_epitaph: 'EPITAPH',
    gameover_btn_new: '🎲 NEW DYNASTY',
    gameover_btn_lineage: '🪶 CONTINUE THE LINEAGE',
    gameover_btn_newgame_plus: '⚡ NEWGAME+ (+5 per gauge)',
    gameover_btn_share: '🔗 SHARE MY REIGN',
    gameover_btn_archives: '📜 Archives',
    gameover_btn_epopee: '📜 GENERATE EPIC',
    gameover_unlocked_relics: 'RELICS UNLOCKED',
    gameover_dynasty: 'LINEAGE — {name}',
    gameover_traits_drift: 'IDEOLOGICAL DRIFT (initial → final)',
    gameover_evolution: 'GAUGE EVOLUTION ({n} points)',
    gameover_political_portrait: 'POLITICAL PORTRAIT',
    gameover_unlocked_achievements: 'ACHIEVEMENTS UNLOCKED',
    gameover_prophecies: '📖 Oracle Prophecies ({fulfilled}/{total} fulfilled)',
    gameover_prophecy_fulfilled: 'fulfilled',
    gameover_prophecy_avoided: 'avoided',
    gameover_decisions_tree: '📊 Key decisions tree ({n})',
    gameover_relics_hint: 'You can activate up to 2 relics before your next reign.',
    gameover_demo_warning: '⚠ Epitaph generated in demo mode',

    // === ENDING TYPES ===
    ending_legendary: '✨ LEGENDARY',
    ending_great: '👑 GLORIOUS',
    ending_good: '⚔ GOOD',
    ending_neutral: '⚖ NEUTRAL',
    ending_bad: '⛓ POOR',
    ending_catastrophic: '💀 CATASTROPHIC',

    // === SETTINGS ===
    settings_title: '⚙ SETTINGS',
    settings_provider: 'AI PROVIDER',
    settings_apikey: 'API KEY',
    settings_apikey_get: '🔑 Get a {provider} API key',
    settings_apikey_test: '🧪 Test connection',
    settings_apikey_local: 'Stored locally only (localStorage). Never sent anywhere except to your chosen provider.',
    settings_model: 'MODEL — 3 fast tiers',
    settings_streaming: 'STREAMING',
    settings_streaming_label: 'Progressive display (text appears as it\'s generated)',
    settings_a11y: 'COMFORT & ACCESSIBILITY',
    settings_audio: '🔊 Audio (synthesized sounds)',
    settings_audio_desc: 'Short click on each decision, fanfare on achievements, low descent on game over. No external audio files.',
    settings_reading: '📖 Reading mode (larger text)',
    settings_reading_desc: 'Increases narration and epitaph size to 19px.',
    settings_contrast: '🌗 High contrast',
    settings_contrast_desc: 'Light palette (beige background, dark text) for better readability.',
    settings_language: '🌐 Language / Langue',
    settings_language_desc: 'Switch the interface between French and English.',
    settings_save: 'Save',
    settings_saved: '✅ Settings saved',

    // === PROFILE ===
    profile_title: '📜 LEGATE PROFILE',
    profile_next: 'Next tier: {label}',
    profile_max: 'Maximum tier reached.',
    profile_streak: '🔥 {n} days',
    profile_total_games: 'Reigns completed',
    profile_total_turns: 'Total turns',
    profile_best_score: 'Best score',
    profile_longest_reign: 'Longest reign',
    profile_genres: 'Genres explored',
    profile_tokens: 'AI tokens used',
    profile_relics: 'RELICS ({unlocked}/{total})',
    profile_achievements: 'ACHIEVEMENTS ({unlocked}/{total})',
    profile_endings: 'ENDING CAUSES (pie chart)',
    profile_dynasties: 'LONGEST DYNASTIES',
    profile_titles: 'TITLE PROGRESSION ({cur}/{total})',
    profile_no_games: 'No reigns completed yet.',
    profile_current_reign: 'CURRENT REIGN — {name}',

    // === MODES ===
    mode_classic: 'Classic',
    mode_classic_desc: 'Standard mode. Game over if a gauge reaches 0 or 100.',
    mode_heritage: 'Heritage',
    mode_heritage_desc: '3 dynastic crises instead of immediate game over. Score ×1.5 if 0 crisis.',
    mode_chronicle: 'Chronicle',
    mode_chronicle_desc: 'No gauge-based ending (clamped 5..95). New era every 25 turns.',

    // === TECH TREE ===
    tech_title: '🔬 DEVELOPMENT TREE',
    tech_treasury: 'Available treasury: {n}/100',
    tech_intro: 'Invest your treasury to unlock permanent tiers. Each tier applies its bonus every N turns.',
    tech_unlock: 'Invest',
    tech_every: 'Every {n} turns',
    tech_unlocked: '✓ Unlocked',
    tech_unlocked_toast: '🔬 {label} unlocked!',
    tech_no_treasury: 'Insufficient treasury — {n} required.',
    tech_maxed: 'Branch already maxed.',
    tech_branch_economy: 'Economy',
    tech_branch_military: 'Military',
    tech_branch_society: 'Society',
    tech_branch_innovation: 'Innovation',

    // === DIPLOMACY / NEIGHBORS ===
    attitude_ally: 'steadfast ally',
    attitude_friend: 'friendly',
    attitude_neutral: 'neutral',
    attitude_tense: 'tense',
    attitude_hostile: 'hostile',

    // === MARKET ===
    market_label: 'World market',

    // === MISC ===
    new_game: '🌐 NEW REIGN',
    api_key_warning: 'Configure an API key to enable AI narration.',
    welcome_first_run: '👋 Welcome to World State Simulator',
    crisis_dynastic: '⚡ DYNASTIC CRISIS — {label}. {n} survivals remaining.',
    era_transition: '🏛 ERA {n} — your chronicle continues.',
    drift_toast: '📈 Your reign becomes {label}.',

    // === RELICS ===
    relic_iron_crown_name: 'Iron Crown',
    relic_iron_crown_desc: '+5 Military at start',
    relic_golden_quill_name: 'Golden Quill',
    relic_golden_quill_desc: '+5 Economy at start',
    relic_mercy_tome_name: 'Tome of Mercy',
    relic_mercy_tome_desc: 'Gauges cannot drop below 5',
    relic_war_banner_name: 'War Banner',
    relic_war_banner_desc: 'Military starts at 80',
    relic_traders_ring_name: 'Trader\'s Ring',
    relic_traders_ring_desc: 'Treasury starts at 75',
    relic_shadow_crown_name: 'Shadow Crown',
    relic_shadow_crown_desc: '+3 bonus on all gauges',
    relic_eternal_flame_name: 'Eternal Flame',
    relic_eternal_flame_desc: 'Legendary endings give ×4 instead of ×3',
    relic_black_seal_name: 'Black Seal',
    relic_black_seal_desc: '+10 bonus everywhere (rare unlock)',

    // === ONBOARDING (first launch) ===
    onb_skip: 'Skip',
    onb_back: 'Back',
    onb_next: 'Next',
    onb_start: 'Begin my reign',
    onb_step: 'Step {n}/{total}',
    onb_1_title: 'Welcome to World State Simulator',
    onb_1_body: 'You lead a nation. Every decision shapes its fate. The story is unique each playthrough — narrated by an AI.',
    onb_2_title: '5 gauges, 5 levers of power',
    onb_2_body: 'Economy · Military · Public Support · Diplomacy · Treasury. Keep them between 0 and 100. If any reaches an extreme, your reign collapses.',
    onb_3_title: 'To choose is to rule',
    onb_3_body: 'Each turn, an event forces a decision. 4 choices offered — or write your own, the AI will judge its consequences.',
    onb_4_title: 'Build a legend',
    onb_4_body: 'Unlock relics, extend dynasties, accumulate titles, replay historical scenarios, climb the tech tree, manage diplomatic neighbors. The more you play, the deeper the experience.',
    onb_5_title: 'Ready to rule?',
    onb_5_body: 'Configure a free AI API key (OpenRouter Gemini) for immersive narration — or play in offline demo mode. Everything is in Settings.',

    // AI prompts language directive
    ai_lang_directive: 'Respond in English.'
  }
};

let _cachedLocale = null;

export function getLocale() {
  if (_cachedLocale) return _cachedLocale;
  try {
    const s = Storage.getSettings();
    _cachedLocale = LOCALES[s.locale] ? s.locale : 'fr';
  } catch {
    _cachedLocale = 'fr';
  }
  return _cachedLocale;
}

export function setLocale(loc) {
  if (!LOCALES[loc]) return false;
  _cachedLocale = loc;
  try {
    Storage.saveSettings({ locale: loc });
    if (typeof document !== 'undefined') {
      document.documentElement.lang = loc;
      document.dispatchEvent(new CustomEvent('regne:locale-change', { detail: { locale: loc } }));
    }
  } catch {}
  return true;
}

// Traduit une clé. params remplace {placeholder} dans la chaîne.
export function t(key, params = null) {
  const loc = getLocale();
  const dict = LOCALES[loc] || LOCALES.fr;
  let s = dict[key];
  if (s === undefined) s = LOCALES.fr[key]; // fallback FR
  if (s === undefined) return key; // fallback ultime : retourne la clé
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}

// Initialise le lang attribute du document au boot.
// Expose aussi `t` sur globalThis pour les modules qui ne peuvent pas l'importer (cycles).
export function initI18n() {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = getLocale();
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.__i18n_t = t;
    globalThis.__i18n_locale = getLocale;
  }
}

// Initialisation immédiate (appelée à l'import) pour que format.js et autres
// puissent utiliser globalThis.__i18n_t dès le boot.
if (typeof globalThis !== 'undefined') {
  globalThis.__i18n_t = t;
  globalThis.__i18n_locale = getLocale;
}
