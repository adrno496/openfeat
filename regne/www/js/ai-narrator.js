// ai-narrator.js — Cerveau narratif du jeu : prompts IA, génération événements/conséquences/épitaphes

import { callAI, callAIStream, safeJsonParse } from './ai-client.js';
import { Storage } from './storage.js';
import { GAUGE_KEYS, sanitizeCustomImpact, calculateScore } from './game-engine.js';
import { pickOfflineEvent, evaluateOfflineCustomChoice, OFFLINE_EVENT_LIBRARY } from './offline-events.js';

function streamingEnabled() {
  try { return Storage.getSettings().useStreaming !== false; } catch { return true; }
}

// --- NATIONS DE SECOURS (mode démo / fallback si l'API plante) ---
export const FALLBACK_NATIONS = [
  {
    name: 'Konfédération de Morthal',
    flag: '🏔',
    era: 'moyen_age_eu',
    eraLabel: 'Confédération tribale, Xe siècle',
    leaderTitle: 'Grande Chieftaine',
    context: "Les clans se déchirent depuis la mort du Grand Conseil. Les plaines s'assèchent. Les voisins aiguisent leurs lames.",
    startingGauges: { economy: 40, military: 60, support: 50, diplomacy: 25, treasury: 30 },
    firstChallenge: 'La sécheresse menace l\'autorité centrale.',
    atmosphere: 'tendu'
  },
  {
    name: 'République de Serval',
    flag: '🌴',
    era: 'xx_siecle',
    eraLabel: 'République bananière, années 1970',
    leaderTitle: 'Présidente',
    context: "Le pays vit de l'exportation de cacao. Les multinationales tirent les ficelles. La rue gronde contre la corruption endémique.",
    startingGauges: { economy: 35, military: 55, support: 30, diplomacy: 40, treasury: 25 },
    firstChallenge: 'Une grève générale paralyse le port principal.',
    atmosphere: 'chaotique'
  },
  {
    name: 'Empire de Vhorath',
    flag: '👁',
    era: 'futur_proche',
    eraLabel: 'Théocratie post-IA, 2089',
    leaderTitle: 'Sultan',
    context: "Une intelligence artificielle vénérée comme divinité régule la société depuis 30 ans. Des dissidents commencent à douter.",
    startingGauges: { economy: 65, military: 50, support: 70, diplomacy: 45, treasury: 60 },
    firstChallenge: 'L\'IA divine refuse de répondre depuis trois jours.',
    atmosphere: 'mysterieux'
  },
  {
    name: 'Cité-État de Lumarie',
    flag: '⚓',
    era: 'renaissance',
    eraLabel: 'Cité commerçante, XVe siècle',
    leaderTitle: 'Doge',
    context: "Une cité maritime prospère grâce au commerce des épices. Les guildes marchandes contestent l'autorité ducale.",
    startingGauges: { economy: 70, military: 35, support: 55, diplomacy: 65, treasury: 55 },
    firstChallenge: 'Une flotte ennemie a été aperçue à 3 jours de la côte.',
    atmosphere: 'ambitieux'
  },
  {
    name: 'Collectivité d\'Auroria',
    flag: '🌌',
    era: 'scifi',
    eraLabel: 'Station spatiale autonome, 2410',
    leaderTitle: 'Coordinateur',
    context: "Une station orbitale de 80 000 âmes vit en quasi-autarcie. La Terre exige un tribut. Les générateurs de gravité fatiguent.",
    startingGauges: { economy: 50, military: 30, support: 60, diplomacy: 35, treasury: 50 },
    firstChallenge: 'Le générateur principal de gravité a vacillé deux fois cette semaine.',
    atmosphere: 'tendu'
  }
];

// --- SCÉNARIOS RAPIDES (1 clic, pas de génération IA pour le pays) ---
export const QUICK_SCENARIOS = [
  {
    id: 'medieval_decline',
    title: 'Royaume en déclin',
    flag: '⚔',
    accent: '#8b3a3a',
    description: 'Un royaume médiéval ravagé par la peste',
    nation: {
      name: 'Royaume d\'Aldorel',
      flag: '⚔',
      era: 'moyen_age_eu',
      eraLabel: 'Royaume médiéval, XIVe siècle',
      leaderTitle: 'Roi',
      context: 'La peste a fauché un tiers du royaume. Les barons s\'agitent, le trésor est vide, et les voisins préparent l\'invasion.',
      firstChallenge: 'Choisir entre payer la garde royale ou nourrir le peuple.',
      atmosphere: 'sombre',
      startingGauges: { economy: 25, military: 40, support: 30, diplomacy: 35, treasury: 15 }
    }
  },
  {
    id: 'cyberpunk_megacity',
    title: 'Néo-Tokyo 2099',
    flag: '🤖',
    accent: '#1f3d7d',
    description: 'Mégacité cyberpunk dominée par les corporations',
    nation: {
      name: 'Enclave de Néo-Shibuya',
      flag: '🤖',
      era: 'cyberpunk',
      eraLabel: 'Cité-État cyberpunk, 2099',
      leaderTitle: 'CEO Souverain',
      context: 'Tu diriges une cité-État sous franchise corporatiste. Trois mégacorps se disputent ton territoire numérique. Les hackers menacent les implants neuronaux du peuple.',
      firstChallenge: 'Une révolte des âmes humaines (anti-augmentés) éclate dans le secteur 7.',
      atmosphere: 'tendu',
      startingGauges: { economy: 70, military: 35, support: 25, diplomacy: 40, treasury: 60 }
    }
  },
  {
    id: 'rome_siege',
    title: 'Rome assiégée',
    flag: '🏛',
    accent: '#9a7a4a',
    description: 'République romaine face aux invasions barbares',
    nation: {
      name: 'République de Rome',
      flag: '🏛',
      era: 'antiquite_rome',
      eraLabel: 'République romaine, IIIe s. av. J.-C.',
      leaderTitle: 'Consul',
      context: 'Carthage avance. Le Sénat exige la guerre. Le peuple veut du pain. Les généraux complotent. Tu as 6 mois.',
      firstChallenge: 'Hannibal franchit les Alpes.',
      atmosphere: 'tendu',
      startingGauges: { economy: 50, military: 65, support: 50, diplomacy: 30, treasury: 55 }
    }
  },
  {
    id: 'banana_republic',
    title: 'République bananière',
    flag: '🌴',
    accent: '#1f7d3a',
    description: 'Pays d\'Amérique latine sous influence US',
    nation: {
      name: 'République de Serval',
      flag: '🌴',
      era: 'xx_siecle',
      eraLabel: 'République latine, années 1970',
      leaderTitle: 'Présidente',
      context: 'Élue de fraîche date sur fond de soupçon de fraude. Les multinationales tirent les ficelles, la guérilla gronde dans le nord, et la CIA t\'appelle deux fois par semaine.',
      firstChallenge: 'Une grève générale paralyse le port d\'exportation.',
      atmosphere: 'chaotique',
      startingGauges: { economy: 35, military: 55, support: 30, diplomacy: 40, treasury: 25 }
    }
  },
  {
    id: 'space_station',
    title: 'Station orbitale isolée',
    flag: '🛸',
    accent: '#5a1f7d',
    description: '80 000 âmes en orbite, la Terre exige tribut',
    nation: {
      name: 'Collectivité d\'Auroria',
      flag: '🛸',
      era: 'scifi',
      eraLabel: 'Station orbitale, 2410',
      leaderTitle: 'Coordinateur',
      context: 'Une station orbitale en quasi-autarcie. La Terre veut son tribut annuel. Le générateur de gravité fatigue. Une faction veut couper les liens définitivement.',
      firstChallenge: 'Le générateur principal vacille deux fois cette semaine.',
      atmosphere: 'tendu',
      startingGauges: { economy: 50, military: 30, support: 60, diplomacy: 35, treasury: 50 }
    }
  },
  {
    id: 'post_apo',
    title: 'Bunker des Cendres',
    flag: '☢',
    accent: '#c08020',
    description: 'Survivants post-effondrement, ressources rares',
    nation: {
      name: 'Bunker Δ-7',
      flag: '☢',
      era: 'post_apo',
      eraLabel: 'Communauté post-apocalyptique, 2098',
      leaderTitle: 'Régent',
      context: '2 700 survivants, 14 ans après l\'Effondrement. Les filtres à air ont 3 mois. Une caravane vient d\'apparaître à l\'horizon. Inconnue.',
      firstChallenge: 'Les filtres à air durent encore 3 mois.',
      atmosphere: 'sombre',
      startingGauges: { economy: 20, military: 40, support: 55, diplomacy: 15, treasury: 10 }
    }
  },
  {
    id: 'fantasy_kingdom',
    title: 'Royaume de magie',
    flag: '🐉',
    accent: '#7d1f2e',
    description: 'Royaume fantasy aux dieux silencieux',
    nation: {
      name: 'Royaume d\'Eldoria',
      flag: '🐉',
      era: 'fantasy',
      eraLabel: 'Royaume fantasy, an 487',
      leaderTitle: 'Sorcier-Roi',
      context: 'Les dieux n\'ont plus parlé depuis 12 ans. La magie s\'affaiblit. Un dragon s\'éveille à l\'est. Les mages-conseillers exigent un sacrifice.',
      firstChallenge: 'La Tour des Mages a perdu son cristal de pouvoir.',
      atmosphere: 'mysterieux',
      startingGauges: { economy: 45, military: 50, support: 60, diplomacy: 40, treasury: 50 }
    }
  },
  {
    id: 'climate_democracy',
    title: 'Démocratie 2035',
    flag: '🌍',
    accent: '#50a050',
    description: 'Pays nordique en pleine crise climatique',
    nation: {
      name: 'Royaume de Nordvik',
      flag: '🌍',
      era: 'contemporain',
      eraLabel: 'Démocratie nordique, 2035',
      leaderTitle: 'Première Ministre',
      context: 'Élue sur un programme de transition écologique radicale. L\'industrie pétrolière paye encore 40% du budget. Les jeunes manifestent toutes les semaines.',
      firstChallenge: 'Référendum sur la sortie du pétrole d\'ici 2030.',
      atmosphere: 'ambitieux',
      startingGauges: { economy: 65, military: 35, support: 55, diplomacy: 70, treasury: 50 }
    }
  },

  // === SCÉNARIOS HISTORIQUES (Phase WSS-3) ===
  {
    id: 'wss_1929_crash',
    title: '1929 — Krach de Wall Street',
    flag: '📉',
    accent: '#1a1a3a',
    description: 'USA, lendemain du Black Tuesday',
    historical: true,
    historicalArcId: 'silver_revolution',
    nation: {
      name: 'États-Unis d\'Amérique',
      flag: '🇺🇸',
      era: 'xx_siecle',
      eraLabel: 'USA, novembre 1929',
      leaderTitle: 'Président',
      context: 'Wall Street vient de s\'effondrer. 25% des banques sombrent, le chômage explose, les Hoovervilles s\'érigent. Le Congrès exige un plan, le Trésor n\'a plus rien.',
      firstChallenge: 'Sauver les banques ou les laisser tomber ?',
      atmosphere: 'sombre',
      startingGauges: { economy: 25, military: 50, support: 35, diplomacy: 50, treasury: 30 }
    }
  },
  {
    id: 'wss_1789_revolution',
    title: '1789 — Veille de Révolution',
    flag: '⚜',
    accent: '#7d1f2e',
    description: 'France, États Généraux convoqués',
    historical: true,
    historicalArcId: 'silver_revolution',
    nation: {
      name: 'Royaume de France',
      flag: '⚜',
      era: 'moderne',
      eraLabel: 'Royaume de France, mai 1789',
      leaderTitle: 'Roi de France',
      context: 'La récolte a manqué. Le Tiers État réclame des comptes. Les nobles refusent l\'impôt. Les pamphlets circulent. Versailles est isolé.',
      firstChallenge: 'Les États Généraux exigent une Constitution.',
      atmosphere: 'tendu',
      startingGauges: { economy: 30, military: 50, support: 20, diplomacy: 45, treasury: 25 }
    }
  },
  {
    id: 'wss_1347_plague',
    title: '1347 — La Peste Noire',
    flag: '☠',
    accent: '#3a1a1a',
    description: 'Royaume médiéval face à la grande pandémie',
    historical: true,
    historicalArcId: 'great_plague',
    nation: {
      name: 'Royaume de Lothir',
      flag: '☠',
      era: 'moyen_age_eu',
      eraLabel: 'Royaume médiéval, hiver 1347',
      leaderTitle: 'Roi',
      context: 'La peste arrive par les ports génois. Les villages se vident. Les flagellants traversent le royaume. Les juifs sont accusés. Les médecins fuient.',
      firstChallenge: 'Confiner les villes ou laisser circuler le clergé ?',
      atmosphere: 'sombre',
      startingGauges: { economy: 30, military: 45, support: 25, diplomacy: 40, treasury: 35 }
    }
  },
  {
    id: 'wss_1962_missiles',
    title: '1962 — Crise des Missiles',
    flag: '☢',
    accent: '#5a1f1f',
    description: 'Treize jours qui ont presque mis fin au monde',
    historical: true,
    historicalArcId: 'foreign_invasion',
    nation: {
      name: 'Union Soviétique',
      flag: '☭',
      era: 'xx_siecle',
      eraLabel: 'URSS, octobre 1962',
      leaderTitle: 'Premier Secrétaire',
      context: 'Kennedy a annoncé la quarantaine de Cuba. Tes missiles sont en place. La flotte américaine bloque l\'Atlantique. Le Politburo est divisé. Une erreur, et c\'est l\'apocalypse.',
      firstChallenge: 'Ordonner aux navires de forcer le blocus, ou faire demi-tour ?',
      atmosphere: 'tendu',
      startingGauges: { economy: 50, military: 80, support: 55, diplomacy: 25, treasury: 45 }
    }
  },
  {
    id: 'wss_2008_subprimes',
    title: '2008 — Crise des Subprimes',
    flag: '🏦',
    accent: '#2a2a4a',
    description: 'Lehman vient de tomber. La cascade s\'amorce.',
    historical: true,
    nation: {
      name: 'Union Économique',
      flag: '💶',
      era: 'contemporain',
      eraLabel: 'Pays G7, septembre 2008',
      leaderTitle: 'Chef du Gouvernement',
      context: 'Lehman Brothers vient de s\'effondrer. AIG suit. Les marchés perdent 15% en une semaine. Les ménages perdent leurs maisons. Le peuple veut du sang, les banques veulent un sauvetage.',
      firstChallenge: 'Plan de sauvetage à 700 milliards : oui ou non ?',
      atmosphere: 'chaotique',
      startingGauges: { economy: 30, military: 55, support: 30, diplomacy: 60, treasury: 20 }
    }
  },
  {
    id: 'wss_1969_moon',
    title: '1969 — Course à la Lune',
    flag: '🚀',
    accent: '#1a3a5a',
    description: 'L\'aigle est sur le point de se poser',
    historical: true,
    nation: {
      name: 'Programme Apollo',
      flag: '🚀',
      era: 'xx_siecle',
      eraLabel: 'États-Unis, été 1969',
      leaderTitle: 'Président',
      context: 'Apollo 11 décolle dans 30 jours. Le Vietnam saigne le budget. Les manifestations grandissent. Le Pentagone veut couper la NASA. Brejnev menace.',
      firstChallenge: 'Maintenir Apollo coûte que coûte, ou sacrifier la mission ?',
      atmosphere: 'ambitieux',
      startingGauges: { economy: 60, military: 70, support: 45, diplomacy: 40, treasury: 35 }
    }
  },
  {
    id: 'wss_1939_wwii',
    title: '1939 — Veille de Guerre',
    flag: '⚔',
    accent: '#3a3a1a',
    description: 'L\'Europe retient son souffle',
    historical: true,
    historicalArcId: 'foreign_invasion',
    nation: {
      name: 'République de Pologne',
      flag: '🦅',
      era: 'xx_siecle',
      eraLabel: 'Pologne, août 1939',
      leaderTitle: 'Maréchal',
      context: 'Hitler exige Dantzig. Staline a signé un pacte secret. Tes alliés français et britanniques promettent de bouger — mais bougeront-ils ? Tu as 7 jours.',
      firstChallenge: 'Mobilisation générale visible, ou silence stratégique ?',
      atmosphere: 'tendu',
      startingGauges: { economy: 45, military: 60, support: 60, diplomacy: 25, treasury: 35 }
    }
  },
  {
    id: 'wss_476_rome',
    title: '476 — Chute de Rome',
    flag: '🏛',
    accent: '#5a3a1a',
    description: 'Le dernier empereur d\'Occident',
    historical: true,
    nation: {
      name: 'Empire Romain d\'Occident',
      flag: '🏛',
      era: 'antiquite_rome',
      eraLabel: 'Empire romain, août 476',
      leaderTitle: 'Empereur',
      context: 'Odoacre marche sur Ravenne. Tes légions sont composées de fédérés barbares qui ne te paieront plus. Le Sénat a déjà négocié. Tu es seul.',
      firstChallenge: 'Fuir vers Byzance, abdiquer, ou tenir la ville ?',
      atmosphere: 'sombre',
      startingGauges: { economy: 25, military: 35, support: 30, diplomacy: 30, treasury: 15 }
    }
  }
];

// --- TIPS ROTATIFS POUR LA HOMEPAGE ---
export const HOME_TIPS = [
  { icon: '✍', text: 'Écris ta propre décision : la 5ᵉ option (texte libre) est notée par l\'IA et a souvent les conséquences les plus surprenantes.' },
  { icon: '⚖', text: 'Les jauges entre 30 et 70 te débloquent l\'achievement Équilibriste — survivre durablement compte autant que la perfection.' },
  { icon: '🌪', text: 'Une crise mondiale frappe tous les 10 tours. Anticipe : garde toujours une jauge solide en réserve.' },
  { icon: '👥', text: 'Tes conseillers persistent tout le règne. L\'IA pioche dans eux, leur personnalité influence ce qu\'ils proposent.' },
  { icon: '🎭', text: 'Configure tes traits dans le profil de dirigeant — l\'IA proposera des choix adaptés à ta personnalité.' },
  { icon: '🔓', text: 'Il existe 8 achievements secrets. Joue différemment à chaque règne pour les découvrir.' },
  { icon: '⚡', text: 'NewGame+ : achève un règne (peu importe l\'issue) et tu débloques le bonus +5 par jauge de départ.' },
  { icon: '🔗', text: 'Partage tes meilleurs règnes : un lien copié dans le presse-papier, ton ami voit ton épitaphe.' },
  { icon: '💰', text: 'Le modèle économique (cheap) est largement suffisant pour la plupart des règnes — passe en premium pour la qualité narrative.' },
  { icon: '🚪', text: 'Bouton 🚪 dans le header de jeu : abandonner sans honte, recommencer une autre histoire.' }
];

export function pickFallbackNation(era = null) {
  if (era) {
    const match = FALLBACK_NATIONS.find((n) => n.era === era);
    if (match) return match;
  }
  return FALLBACK_NATIONS[Math.floor(Math.random() * FALLBACK_NATIONS.length)];
}

// --- CONTEXTE COMPACT POUR L'IA ---
export function buildGameContext(gameState) {
  const { country, gauges, turn, year, history, keyFacts, advisors, traits, neighbors, market, tech } = gameState;

  const gaugeLine = (key, label) => {
    const v = gauges[key];
    let warn = '';
    if (v <= 20) warn = ' ⚠ CRITIQUE';
    else if (v >= 80) warn = ' ⚠ EXCÈS';
    return `- ${label} : ${v}${warn}`;
  };

  // Conseillers persistants : on les expose pour que l'IA les pioche
  const advisorsBlock = advisors && advisors.length
    ? `\nCONSEILLERS DU DIRIGEANT (à utiliser dans tes événements) :\n` +
      advisors.map((a) => `- ${a.name}, ${a.title} (${a.personality})`).join('\n')
    : '';

  // Phase WSS-6 : technologies débloquées — pour que l'IA puisse les évoquer
  let techBlock = '';
  if (tech) {
    const unlocked = Object.entries(tech).filter(([_, lvl]) => lvl > 0).map(([id, lvl]) => `${id} T${lvl}`);
    if (unlocked.length) techBlock = `\nTECHNOLOGIES DÉBLOQUÉES : ${unlocked.join(', ')}`;
  }

  // Phase WSS-5 : marché mondial — n'injecte que les variations significatives (>15%)
  let marketBlock = '';
  if (market) {
    const moves = [];
    for (const [k, v] of Object.entries(market)) {
      const pct = Math.round((v - 1.0) * 100);
      if (Math.abs(pct) >= 15) moves.push(`${k} ${pct > 0 ? '+' : ''}${pct}%`);
    }
    if (moves.length) marketBlock = `\nMARCHÉ MONDIAL (à mentionner dans events économiques) : ${moves.join(', ')}`;
  }

  // Phase WSS-4 : nations voisines (à utiliser pour les events diplomatic/military)
  const neighborsBlock = neighbors && neighbors.length
    ? `\nNATIONS VOISINES (à nommer dans les événements diplomatiques ou militaires) :\n` +
      neighbors.map((n) => {
        // Attitude en mots simples (sans i18n ici — juste pour le prompt IA, ton agnostique)
        const att = n.attitude >= 75 ? 'ally' : (n.attitude >= 60 ? 'friendly' : (n.attitude >= 40 ? 'neutral' : (n.attitude >= 25 ? 'tense' : 'hostile')));
        return `- ${n.name} (${n.regime}, power ${n.power}, attitude ${att})`;
      }).join('\n')
    : '';

  // Traits du joueur : pour orienter la nature des choix
  const traitsBlock = traits && Object.keys(traits).length
    ? `\nTRAITS DU DIRIGEANT : ${describeTraitsLine(traits)}`
    : '';

  // Crise mondiale tous les 10 tours
  const crisisBlock = (turn % 10 === 0 && turn > 0)
    ? `\n⚠ CRISE MONDIALE EN COURS — Cet événement DOIT refléter une crise majeure : pandémie, guerre régionale, catastrophe climatique, krach financier mondial, etc. Urgency = critical.`
    : '';

  // Arc narratif actif (Phase 3.3) : injecté pour cohérence cross-tours.
  // Le hint est stocké dans gameState.activeArcHint au déclenchement (synchrone).
  const arcBlock = gameState.activeArcId && gameState.activeArcHint
    ? `\n\n📖 ARC NARRATIF ACTIF — "${gameState.activeArcHint}" — Ton événement DOIT s'inscrire dans cet arc et faire avancer la situation.`
    : '';

  return `PAYS : ${country.name} (${country.eraLabel || country.era})
DIRIGEANT : ${country.leaderName || 'Sans nom'}, ${country.leaderTitle || 'Dirigeant'}
TOUR : ${turn} | ANNÉE : ${year ?? '—'}

JAUGES ACTUELLES (0-100) :
${gaugeLine('economy', 'Économie')}
${gaugeLine('military', 'Armée')}
${gaugeLine('support', 'Soutien populaire')}
${gaugeLine('diplomacy', 'Diplomatie')}
${gaugeLine('treasury', 'Trésor')}
${advisorsBlock}${neighborsBlock}${marketBlock}${techBlock}${traitsBlock}${crisisBlock}${arcBlock}

FAITS CLÉS DU RÈGNE :
${(keyFacts || []).length > 0 ? keyFacts.map((f) => `- ${f}`).join('\n') : '- Règne débutant'}

DERNIÈRES DÉCISIONS (${(history || []).length} tours récents) :
${(history || []).slice(-5).map((h) => `Tour ${h.turn}: "${h.choiceText}" → ${h.outcome || '—'}`).join('\n') || '- Aucune décision encore'}`;
}

function describeTraitsLine(traits) {
  const map = {
    pragmatism: ['très pragmatique', 'modérément pragmatique', 'équilibré', 'idéaliste', 'profondément idéaliste'],
    force: ['adepte de la force', 'plutôt ferme', 'équilibré', 'plutôt diplomate', 'très diplomate'],
    tradition: ['très traditionnel', 'plutôt conservateur', 'équilibré', 'plutôt progressiste', 'très innovant'],
    discretion: ['très discret', 'plutôt discret', 'équilibré', 'plutôt charismatique', 'très charismatique']
  };
  const out = [];
  for (const [k, v] of Object.entries(traits || {})) {
    const labels = map[k];
    if (!labels) continue;
    const idx = v <= 20 ? 0 : v <= 40 ? 1 : v <= 60 ? 2 : v <= 80 ? 3 : 4;
    out.push(labels[idx]);
  }
  return out.join(', ');
}

// --- TONALITÉ HYBRIDE ADAPTATIVE ---
// Selon le genre du règne, l'IA bascule entre ton littéraire (Sire, parchemin) et
// ton géopolitique factuel (Wall Street, factions nommées, économie chiffrée).
const MODERN_GENRES = new Set([
  'contemporain', 'xx_siecle', 'futur_proche', 'futur_lointain',
  'cyberpunk', 'scifi', 'uchronie'
]);

export function getToneInstructions(genre) {
  if (MODERN_GENRES.has(genre)) {
    return `TONALITÉ : ton géopolitique factuel — style dépêche d'agence/news. Cite des factions plausibles
(banques centrales, OTAN, BRICS, mégacorpos, syndicats, ONG selon le contexte). Économie chiffrée
(milliards, %, taux). Pas de "Sire" ni de vocabulaire courtoisie médiévale. Conseillers = ministres,
analystes, directeurs d'agence. Ton sec, lucide, parfois cynique.`;
  }
  return `TONALITÉ : ton littéraire — Sire, parchemin, ducs et émissaires. Style vivant et imagé,
images sensorielles (le vent du nord, l'or des coffres). Conseillers = chambellans, capitaines,
ambassadeurs. Pas de "Wall Street" ni de jargon géopolitique moderne hors-genre.`;
}

// Wrappe un system prompt avec les instructions de tonalité ET la directive de langue.
function withTone(basePrompt, gameState) {
  const genre = gameState?.genre || gameState?.country?.era;
  // Directive de langue lue dynamiquement (évite import circulaire)
  let langDir = 'Réponds en français.';
  try {
    const settings = Storage.getSettings();
    if (settings.locale === 'en') langDir = 'Respond in English.';
  } catch {}
  return `${basePrompt}\n\n${getToneInstructions(genre)}\n\n${WSS_STYLE}\n\n${langDir}`;
}

// Style maison WORLD STATE : lisible, immersif, sans jargon.
// S'applique à TOUS les textes générés (events, conséquences, épitaphes, épopée, prophéties).
const WSS_STYLE = `STYLE WORLD STATE — texte DIGESTE, écrit pour être lu sur mobile :

LISIBILITÉ (règle dure) :
- Phrases COURTES : 8-15 mots. Pas plus. Une idée = une phrase.
- Aère le texte : saute une ligne (deux retours à la ligne) tous les 2-3 phrases. Petits paragraphes.
- Mots du quotidien. Si un mot a un équivalent plus simple, prends le plus simple.
- Bannis : "instrumentalisation", "paradigme", "structurel", "systémique", "endogène", "exogène",
  "hégémonie", "résilience", "polarisation", "narratif", "exacerber", "prégnant", "inhérent".
- Pas de subordonnées empilées. Pas de virgules à rallonge. Coupe en deux phrases.

IMMERSION :
- Montre, ne disserte pas. Au lieu de "tensions sociopolitiques exacerbées" → "la rue gronde".
- Présent vivant. Un bruit, un visage, un chiffre brut, un détail concret.
- Verbes forts, peu d'adjectifs. Évite "très", "extrêmement", "particulièrement".

FORMAT :
- Zéro emoji dans la narration. Zéro markdown (**gras**, *italique*, listes).
- Zéro guillemet décoratif. Pas de phrases-pavés.`;

// --- GÉNÉRATION D'ÉVÉNEMENT ---
const EVENT_SYSTEM_PROMPT = `Tu es le narrateur du jeu de gouvernance WORLD STATE SIMULATOR.
Génère un événement cohérent avec le contexte. Si une jauge est <20, traite-la. Si >75, exploite cette tension.
Les 4 choix doivent être VRAIMENT distincts (philosophies différentes). Impacts entre -20 et +20.
Pas de contenu haineux/violence glorifiée. JSON strict, pas de markdown.

CHAMP "flavor" CRITIQUE : phrase courte narrative (8-14 mots) qui évoque l'AMBIANCE ou l'ESPRIT du choix.
JAMAIS de mention de jauge, de "+", "-", de symboles ↑↓💰⚔🌍, ou d'effets mécaniques.
Exemples valides : "Le peuple bénira ce geste, mais les coffres saigneront."
                   "Une décision impopulaire qui restaurera l'autorité."
                   "Risquer l'humiliation pour préserver la paix."
Exemples INVALIDES : "Coûteux mais populaire ↑👥↓🏛", "Économie -5, Soutien +10", "Risqué pour le trésor".

FORMAT :
{"category":"economie|militaire|social|diplomatique|crise|opportunite|inattendu",
"urgency":"low|medium|high|critical",
"title":"3-6 mots",
"context":"40-65 mots, deux micro-paragraphes séparés par \\n\\n. Phrases courtes (8-15 mots). Première phrase : la scène concrète. Suite : l'enjeu, en mots simples.",
"advisor":"Nom + titre",
"advisorQuote":"1 phrase",
"choices":[
{"label":"3-6 mots","description":"15-25 mots","philosophy":"pragmatique|humaniste|militariste|diplomatique|liberale|populiste|autocratique|ecologique","flavor":"phrase narrative courte 8-14 mots, sans symboles ni mention de jauges","hiddenImpacts":{"economy":0,"military":0,"support":0,"diplomacy":0,"treasury":0}},
{...},{...},{...},
{"label":"Votre décision...","description":"Écrivez votre propre réponse","philosophy":"libre","flavor":"L'Histoire jugera votre voie.","hiddenImpacts":null}],
"keyFactIfChosen":"phrase ou null"}`;

export async function generateEvent(gameState) {
  const context = buildGameContext(gameState);
  const userPrompt = `CONTEXTE DE LA PARTIE :
${context}

Génère l'événement du tour ${gameState.turn}. Renvoie UNIQUEMENT le JSON.`;

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { content, tokensIn, tokensOut, cost } = await callAI(
        [{ role: 'user', content: userPrompt }],
        { systemPrompt: withTone(EVENT_SYSTEM_PROMPT, gameState), maxTokens: 900, temperature: 0.9 }
      );
      const event = safeJsonParse(content);
      if (event && validateEvent(event)) {
        return { event: normalizeEvent(event), tokensIn, tokensOut, cost };
      }
      lastError = new Error('JSON invalide ou structure incorrecte');
    } catch (err) {
      lastError = err;
    }
  }
  // Fallback : événement de secours générique
  return { event: buildFallbackEvent(gameState), tokensIn: 0, tokensOut: 0, cost: 0, fallback: true, error: String(lastError?.message || lastError) };
}

function validateEvent(e) {
  if (!e || typeof e !== 'object') return false;
  if (!e.title || !e.context || !Array.isArray(e.choices)) return false;
  if (e.choices.length < 4) return false;
  return true;
}

function normalizeEvent(e) {
  // Garantit la 5e option libre
  const choices = e.choices.slice(0, 5);
  while (choices.length < 4) {
    choices.push({
      label: 'Ne rien faire',
      description: 'Attendre que la situation évolue',
      philosophy: 'pragmatique',
      flavor: 'Le silence du pouvoir, un pari sur le temps.',
      hiddenImpacts: { economy: 0, military: 0, support: -2, diplomacy: 0, treasury: 0 }
    });
  }
  if (choices.length === 4 || choices[4]?.philosophy !== 'libre') {
    choices[4] = {
      label: 'Votre décision…',
      description: 'Écrivez votre propre réponse',
      philosophy: 'libre',
      flavor: "L'Histoire jugera votre voie.",
      hiddenImpacts: null
    };
  }
  // Sanitize hidden impacts + normaliser le flavor (rétrocompat avec visibleImpact)
  for (let i = 0; i < 4; i++) {
    const c = choices[i];
    c.hiddenImpacts = sanitizeImpactStrict(c.hiddenImpacts || {});
    // Si l'IA a renvoyé visibleImpact (ancien nom), le copier dans flavor et nettoyer
    if (!c.flavor && c.visibleImpact) c.flavor = c.visibleImpact;
    c.flavor = sanitizeFlavor(c.flavor || '');
  }
  // 5e choix libre : garder un flavor narratif, jamais de mention mécanique
  if (choices[4]) choices[4].flavor = sanitizeFlavor(choices[4].flavor || choices[4].visibleImpact || "L'Histoire jugera votre voie.");
  return {
    category: e.category || 'inattendu',
    urgency: e.urgency || 'medium',
    title: String(e.title).slice(0, 80),
    context: String(e.context),
    advisor: e.advisor || 'Un conseiller',
    advisorQuote: e.advisorQuote || '',
    choices,
    keyFactIfChosen: e.keyFactIfChosen || null
  };
}

// Nettoie un flavor : retire les symboles mécaniques (↑↓💰⚔🌍🏛👥), les "+5", les "Économie -3", etc.
function sanitizeFlavor(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let f = raw.trim();
  // Retire les symboles directionnels et icônes de jauge
  f = f.replace(/[↑↓⬆⬇➕➖]/g, '');
  f = f.replace(/[💰⚔🌍🏛👥🛡⚖]/g, '');
  // Retire les motifs type "Économie -5", "Soutien +10", "+5 trésor"
  f = f.replace(/\b(?:[\+\-]?\d+)\s*(?:économie|armée|militaire|soutien|diplomatie|trésor|jauge)s?\b/gi, '');
  f = f.replace(/\b(?:économie|armée|militaire|soutien|diplomatie|trésor)\s*[\+\-]?\d+\b/gi, '');
  // Retire les "(coûteux)", "(populaire)" en parenthèses isolés
  f = f.replace(/\s{2,}/g, ' ').replace(/\s*[,;]\s*$/, '').trim();
  return f;
}

function sanitizeImpactStrict(raw) {
  const out = {};
  for (const k of GAUGE_KEYS) {
    const v = Number(raw[k]);
    out[k] = Number.isFinite(v) ? Math.max(-20, Math.min(20, Math.round(v))) : 0;
  }
  return out;
}

// Fallback event : pioche dans la bibliothèque offline (Phase 2).
// Tracker des IDs récemment joués pour éviter la répétition.
function buildFallbackEvent(gameState) {
  try {
    const picked = pickOfflineEvent(gameState);
    // Persiste l'ID dans la liste des événements récents (cap à 10)
    const cur = Storage.getCurrentGame();
    if (cur) {
      const recent = (cur.recentOfflineEventIds || []).slice(-9);
      recent.push(picked.id);
      cur.recentOfflineEventIds = recent;
      Storage.saveCurrentGame(cur);
    }
    return picked;
  } catch (err) {
    console.warn('[offline] pick failed, using static fallback:', err);
    return _staticFallback(gameState);
  }
}

function _staticFallback(gameState) {
  const lowest = GAUGE_KEYS.reduce((min, k) =>
    gameState.gauges[k] < gameState.gauges[min] ? k : min, GAUGE_KEYS[0]);
  return {
    category: 'crise',
    urgency: 'high',
    title: 'Une situation tendue',
    context: `Le pays traverse une période difficile concernant ${lowest}. Vous devez trancher.`,
    advisor: 'Le Conseil',
    advisorQuote: 'Que décidez-vous ?',
    choices: [
      { label: 'Mesures fermes', description: 'Intervenir avec autorité', philosophy: 'autocratique', flavor: 'Main de fer.', hiddenImpacts: { military: 5, support: -5 } },
      { label: 'Concertation', description: 'Trouver un compromis', philosophy: 'diplomatique', flavor: 'Voie du dialogue.', hiddenImpacts: { support: 6, diplomacy: 4 } },
      { label: 'Investissement', description: 'Débloquer des fonds', philosophy: 'humaniste', flavor: 'Geste public.', hiddenImpacts: { support: 5, treasury: -10 } },
      { label: 'Laisser faire', description: 'Ne pas intervenir', philosophy: 'liberale', flavor: 'Laisser le destin.', hiddenImpacts: { economy: -2 } },
      { label: 'Votre décision…', description: 'Écrivez votre propre réponse', philosophy: 'libre', flavor: "L'Histoire jugera.", hiddenImpacts: null }
    ]
  };
}

// --- ÉVALUATION DU CHOIX LIBRE ---
const CUSTOM_SYSTEM_PROMPT = `Arbitre RÈGNE. Évalue la décision libre du joueur.
Sois équitable, pas complaisant : mauvaise idée = conséquences négatives. JSON strict, pas de markdown.

FORMAT :
{"quality":0-100,
"philosophy":"pragmatique|humaniste|militariste|diplomatique|liberale|populiste|autocratique|ecologique|incoherente",
"impacts":{"economy":-15..15,"military":-15..15,"support":-15..15,"diplomacy":-15..15,"treasury":-15..15},
"consequence":"50-70 mots de narration"}`;

export async function evaluateCustomChoice(gameState, event, customText) {
  const context = buildGameContext(gameState);
  const userPrompt = `${context}

Événement : "${event.title}"
Contexte : ${event.context}

Le joueur a répondu : "${customText}"

Évalue et génère les impacts. Renvoie UNIQUEMENT le JSON.`;

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { content, tokensIn, tokensOut, cost } = await callAI(
        [{ role: 'user', content: userPrompt }],
        { systemPrompt: withTone(CUSTOM_SYSTEM_PROMPT, gameState), maxTokens: 350, temperature: 0.7 }
      );
      const evalRes = safeJsonParse(content);
      if (evalRes && typeof evalRes === 'object') {
        return {
          evaluation: {
            quality: Math.max(0, Math.min(100, Math.round(Number(evalRes.quality) || 50))),
            philosophy: String(evalRes.philosophy || 'libre'),
            impacts: sanitizeCustomImpact(evalRes.impacts, 15),
            consequence: String(evalRes.consequence || 'Votre décision a eu des effets mitigés.')
          },
          tokensIn, tokensOut, cost
        };
      }
      lastError = new Error('JSON invalide');
    } catch (err) {
      lastError = err;
    }
  }
  // Fallback offline (Phase 2) : analyse heuristique du texte saisi
  const offline = evaluateOfflineCustomChoice(customText, gameState);
  return {
    evaluation: {
      quality: offline.quality,
      philosophy: offline.philosophy,
      impacts: sanitizeCustomImpact(offline.impacts, 12),
      consequence: offline.consequence
    },
    tokensIn: 0, tokensOut: 0, cost: 0,
    fallback: true,
    error: String(lastError?.message || lastError)
  };
}

// --- CONSÉQUENCE NARRATIVE (après choix A/B/C/D) ---
const CONSEQUENCE_SYSTEM_PROMPT = `Narrateur WORLD STATE. Raconte ce qui se passe juste après la décision.

LONGUEUR : 35-55 mots MAX. Trois micro-paragraphes séparés par une ligne vide.
- Paragraphe 1 (1 phrase) : la scène. Un lieu, un visage, un bruit.
- Paragraphe 2 (1-2 phrases) : ce que la décision déclenche concrètement.
- Paragraphe 3 (1 phrase) : ce qui menace ou plane ensuite.

Texte brut, sans JSON ni markdown. Pas de titre.`;

export async function generateConsequence(gameState, event, choiceIndex, gaugesBefore, gaugesAfter, onChunk = null) {
  const choice = event.choices[choiceIndex];
  const context = buildGameContext(gameState);
  const changes = GAUGE_KEYS
    .map((k) => {
      const d = gaugesAfter[k] - gaugesBefore[k];
      return `${k}: ${gaugesBefore[k]}→${gaugesAfter[k]} (${d >= 0 ? '+' : ''}${d})`;
    })
    .join(', ');

  const messages = [{
    role: 'user',
    content: `${context}

Événement : "${event.title}"
Décision prise : "${choice.label}" — ${choice.description}
Impacts mécaniques : ${changes}

Narre la conséquence en 70-100 mots.`
  }];
  const opts = { systemPrompt: withTone(CONSEQUENCE_SYSTEM_PROMPT, gameState), maxTokens: 350, temperature: 0.85 };

  try {
    const useStream = streamingEnabled() && typeof onChunk === 'function';
    const fastOpts = { ...opts, maxTokens: 250 };
    const { content, tokensIn, tokensOut, cost } = useStream
      ? await callAIStream(messages, fastOpts, onChunk)
      : await callAI(messages, fastOpts);
    return { consequence: content.trim(), tokensIn, tokensOut, cost };
  } catch (err) {
    return {
      consequence: `La décision est appliquée. Les premiers effets se font sentir : ${changes}. Les conseillers attendent la prochaine échéance.`,
      tokensIn: 0, tokensOut: 0, cost: 0,
      fallback: true,
      error: String(err.message || err)
    };
  }
}

// --- ÉPITAPHE DE FIN DE RÈGNE ---
const EPITAPH_SYSTEM_PROMPT = `Chroniqueur de WORLD STATE. Le règne s'achève — écris ce que retiendra l'Histoire.

LONGUEUR : 90-120 mots, JAMAIS plus. Trois paragraphes séparés par une ligne vide :
- Paragraphe 1 (2-3 phrases) : la fin. La scène, l'ambiance. Pas d'analyse.
- Paragraphe 2 (2-3 phrases) : cite 2-3 décisions marquantes, en mots simples.
- Paragraphe 3 (1 phrase verdict) : sèche, qui frappe. Une ligne, point final.

Ton sérieux, parfois cruel ou ironique si le règne fut un désastre. Texte brut, pas de JSON.`;

export async function generateEpitaph(gameState, endingType, gameOverReason, onChunk = null) {
  const context = buildGameContext(gameState);
  const score = calculateScore(gameState.turn, gameState.gauges, endingType, []);

  const messages = [{
    role: 'user',
    content: `${context}

Fin du règne : ${gameOverReason}
Type de fin : ${endingType}
Score final : ${score}

Écris l'épitaphe.`
  }];
  const opts = { systemPrompt: withTone(EPITAPH_SYSTEM_PROMPT, gameState), maxTokens: 600, temperature: 0.9 };

  try {
    const useStream = streamingEnabled() && typeof onChunk === 'function';
    const fastOpts = { ...opts, maxTokens: 400 };
    const { content, tokensIn, tokensOut, cost } = useStream
      ? await callAIStream(messages, fastOpts, onChunk)
      : await callAI(messages, fastOpts);
    return { epitaph: content.trim(), tokensIn, tokensOut, cost };
  } catch (err) {
    return {
      epitaph: buildFallbackEpitaph(gameState, endingType, gameOverReason),
      tokensIn: 0, tokensOut: 0, cost: 0,
      fallback: true,
      error: String(err.message || err)
    };
  }
}

function buildFallbackEpitaph(gs, endingType, reason) {
  const titles = {
    legendary: 'restera dans l\'Histoire comme une figure d\'exception',
    great: 'sera retenu(e) comme un grand dirigeant',
    good: 'a tenu sa charge avec mesure',
    neutral: 'a régné sans laisser de trace particulière',
    bad: 'a déçu son peuple',
    catastrophic: 'a été emporté(e) par les évènements'
  };
  return `${gs.country.leaderName || 'Le dirigeant'}, ${gs.country.leaderTitle || 'souverain'} de ${gs.country.name}, ${titles[endingType] || 'a régné'}. Son règne aura duré ${gs.turn} tours.

Cause de la fin : ${reason}.

L'Histoire retiendra ce qu'elle voudra.`;
}

// --- GÉNÉRATION DE NATION ALÉATOIRE ---
// Themes par genre (cyberpunk, médiéval, etc.)
export const GENRES = {
  random:    { label: 'Surprise totale', icon: '🎲', desc: 'L\'IA invente librement', themes: null },
  medieval:  { label: 'Médiéval',        icon: '🏰', desc: 'Royaumes, chevaliers, fiefs', themes: ['empire maritime médiéval en déclin', 'royaume féodal du XIIIe siècle', 'confédération tribale en montagne au Xe siècle', 'duché médiéval miné par les croisades', 'royaume oriental sous menace mongole'] },
  antique:   { label: 'Antique',         icon: '🏛', desc: 'Cités, empires, mythes', themes: ['cité-état grecque du IVe s. av. J.-C.', 'République romaine en crise', 'royaume hellénistique post-Alexandre', 'pharaonat en bord de Nil', 'empire perse face aux Grecs'] },
  renaissance:{ label: 'Renaissance',    icon: '🎨', desc: 'Marchands, peintres, intrigues', themes: ['cité-état commerciale italienne du XVe', 'royaume ibérique aux Indes occidentales', 'principauté allemande sous la Réforme', 'sultanat ottoman montant'] },
  industriel:{ label: 'XIXe / Industriel', icon: '🏭', desc: 'Vapeur, colonies, syndicats', themes: ['empire colonial en pleine expansion', 'monarchie post-révolution industrielle', 'république latino-américaine fragile', 'tsarat à la veille de l\'abolition du servage'] },
  historique:{ label: 'Historique XXe',  icon: '📰', desc: 'Guerres mondiales, décolonisation', themes: ['nation européenne entre-deux-guerres', 'pays décolonisé années 60', 'satellite soviétique des années 70', 'république bananière années 70', 'jeune nation africaine post-indépendance'] },
  contemporain:{ label: 'Contemporain',  icon: '🌐', desc: 'Crises, climat, geopolitique 2025+', themes: ['démocratie nordique en crise climatique', 'pétro-monarchie du Golfe en transition énergétique', 'puissance émergente d\'Asie du Sud-Est', 'micro-état européen en tension UE'] },
  futur:     { label: 'Futur proche',    icon: '🛰', desc: 'IA, climat, biotech 2030-2080', themes: ['démocratie sous gouvernance IA en 2087', 'archipel artificiel post-submersion 2070', 'nation insulaire futuriste post-IA', 'union de villes-États climatiques 2065'] },
  cyberpunk: { label: 'Cyberpunk',       icon: '🤖', desc: 'Mégacorps, neuro-implants, néon', themes: ['cité-état corporatiste néo-asiatique', 'enclave cyberpunk indépendante', 'mégalopole sous franchises corporatistes', 'collectif hacktiviste reconnu comme nation'] },
  scifi:     { label: 'Sci-Fi spatial',  icon: '🚀', desc: 'Stations, colonies, exo-planètes', themes: ['nation spatiale en orbite terrestre', 'colonie martienne autonome', 'collectivité de stations orbitales', 'fédération d\'astéroïdes miniers'] },
  postapo:   { label: 'Post-apo',        icon: '☢', desc: 'Ruines, factions, rationnement', themes: ['cité fortifiée post-effondrement nucléaire', 'communauté souterraine post-extinction', 'caravane nomade dans des ruines', 'fédération de bunkers reliés'] },
  fantasy:   { label: 'Fantasy',         icon: '🐉', desc: 'Magie, races, royaumes oubliés', themes: ['théocratie fantastique aux dieux silencieux', 'royaume elfique en déclin', 'cité naine assiégée par les ombres', 'archipel humain face à des créatures marines'] },
  steampunk: { label: 'Steampunk',       icon: '⚙', desc: 'Vapeur, dirigeables, mécanique', themes: ['empire à vapeur du XIXe alternatif', 'fédération de dirigeables', 'cité industrielle perpétuelle', 'colonie britannique mécanisée des Indes'] },
  uchronie:  { label: 'Uchronie',        icon: '🌀', desc: 'Histoire alternative', themes: ['Rome qui n\'aurait jamais chuté', 'Allemagne victorieuse en 1940', 'Empire aztèque ayant repoussé Cortés', 'Révolution française avortée'] }
};

const ALL_THEMES = Object.values(GENRES).filter((g) => g.themes).flatMap((g) => g.themes);

const NATION_SYSTEM_PROMPT = `Tu génères un pays fictif pour un jeu de gouvernance.
Mélange librement les époques, les archétypes, les défis. Sois créatif et surprenant.

FORMAT JSON STRICT (pas de markdown) :
{
  "name": "Nom du pays inventé",
  "flag": "1 emoji représentatif",
  "era": "moyen_age_eu|renaissance|moderne|contemporain|futur_proche|futur_lointain|fantasy|scifi|post_apo|cyberpunk|steampunk|uchronie",
  "eraLabel": "Description courte de l'époque (ex: 'Empire du XVIe siècle')",
  "leaderTitle": "Titre du dirigeant (ex: Sultan, Présidente, Imperatrice, Coordinateur)",
  "context": "Situation de départ : 2-3 phrases décrivant les défis immédiats",
  "startingGauges": { "economy": 30-70, "military": 30-70, "support": 30-70, "diplomacy": 30-70, "treasury": 30-70 },
  "firstChallenge": "Le premier grand défi qui attend ce pays (1 phrase)",
  "atmosphere": "sombre|tendu|ambitieux|prospere|chaotique|mysterieux"
}`;

export async function generateRandomNation(genreKey = 'random') {
  const genre = GENRES[genreKey] || GENRES.random;
  const themes = genre.themes || ALL_THEMES;
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const genreLabel = genre.label;

  try {
    const { content, tokensIn, tokensOut, cost } = await callAI(
      [{ role: 'user', content: `Génère un pays de genre "${genreLabel}", thème spécifique : "${theme}". Sois original et surprenant. Renvoie UNIQUEMENT le JSON.` }],
      { systemPrompt: NATION_SYSTEM_PROMPT, maxTokens: 700, temperature: 0.95 }
    );
    const parsed = safeJsonParse(content);
    if (parsed && parsed.name && parsed.startingGauges) {
      return {
        nation: normalizeNation(parsed),
        theme, genre: genreKey, tokensIn, tokensOut, cost
      };
    }
  } catch (err) {
    // tomber dans le fallback
  }
  return {
    nation: pickFallbackNation(),
    theme, genre: genreKey,
    tokensIn: 0, tokensOut: 0, cost: 0,
    fallback: true
  };
}

// === PHASE 7.4 — GÉNÉRATEUR D'ÉPOPÉE ===
// Produit un texte de 300-400 mots style entrée d'encyclopédie historique.
// IA si dispo, sinon template enrichi avec keyFacts + stats.
const EPOPEE_SYSTEM_PROMPT = `Tu es un chroniqueur. Raconte ce règne comme une histoire qu'on lit le soir, pas une fiche Wikipédia.

LONGUEUR : 200-280 mots, 5-6 paragraphes COURTS séparés par une ligne vide.
Chaque paragraphe : 2-4 phrases maximum. Une idée principale par paragraphe.

CONTENU : troisième personne, présent ou passé simple.
Cite par leur nom les conseillers marquants, les crises traversées, les décisions clés du contexte.
N'invente rien hors contexte. Vise l'image forte, pas l'analyse savante.

Prose continue, pas de listes à puces. Pas de titres de section.`;

export async function generateEpopee(gameState, completedSummary, onChunk = null) {
  const { country } = gameState;
  const stats = completedSummary?.stats || {};
  const philoLine = stats.philosophyDominant ? `Philosophie dominante : ${stats.philosophyDominant.label} (${stats.philosophyDominant.count} décisions).` : '';
  const flagged = (stats.flaggedDecisions || []).slice(0, 6).map((d) => `Tour ${d.turn} : ${d.label}`).join('\n');
  const advisors = (gameState.advisors || []).map((a) => `- ${a.name}, ${a.title} (${a.personality}${a.deceased ? ', décédé' : ''})`).join('\n');
  const factsBlock = (gameState.keyFacts || []).slice(-12).map((f) => `- ${f}`).join('\n') || '- (aucun fait clé enregistré)';

  const messages = [{
    role: 'user',
    content: `PAYS : ${country.name} (${country.eraLabel || country.era})
DIRIGEANT : ${country.leaderName || 'Anonyme'}, ${country.leaderTitle || 'souverain'}
DURÉE : ${completedSummary?.totalTurns || gameState.turn} tours
FIN : ${completedSummary?.endingType || '—'}
SCORE : ${completedSummary?.finalScore || 0}
${philoLine}

CONSEILLERS DE LA COUR :
${advisors || '- (aucun)'}

FAITS CLÉS DU RÈGNE :
${factsBlock}

DÉCISIONS MARQUANTES :
${flagged || '- (aucune)'}

ÉPITAPHE FINALE : ${completedSummary?.endingNarrative || ''}

Rédige maintenant l'entrée d'encyclopédie de ce règne.`
  }];

  try {
    const opts = { systemPrompt: withTone(EPOPEE_SYSTEM_PROMPT, gameState), maxTokens: 700, temperature: 0.85 };
    const useStream = streamingEnabled() && typeof onChunk === 'function';
    const r = useStream
      ? await callAIStream(messages, opts, onChunk)
      : await callAI(messages, opts);
    return { epopee: r.content.trim(), tokensIn: r.tokensIn, tokensOut: r.tokensOut, cost: r.cost };
  } catch (err) {
    return {
      epopee: buildFallbackEpopee(gameState, completedSummary),
      tokensIn: 0, tokensOut: 0, cost: 0,
      fallback: true, error: String(err.message || err)
    };
  }
}

function buildFallbackEpopee(gs, comp) {
  const c = gs.country || {};
  const turns = comp?.totalTurns || gs.turn || 0;
  const ending = comp?.endingType || 'neutral';
  const philo = comp?.stats?.philosophyDominant?.label || 'pragmatique';
  const score = comp?.finalScore || 0;
  const facts = (gs.keyFacts || []).slice(-6);
  const flagged = (comp?.stats?.flaggedDecisions || []).slice(0, 4);
  const adv = (gs.advisors || []).filter((a) => !a.deceased).slice(0, 2).map((a) => a.name).join(' et ');
  const endingDesc = {
    legendary: 'inscrivit son nom au panthéon des grands dirigeants',
    great: 'laissa une nation prospère et respectée',
    good: 'gouverna avec mesure et tint sa charge',
    neutral: 'régna sans laisser de marque indélébile',
    bad: 'présida à une période de doute et de revers',
    catastrophic: 'vit son règne s\'effondrer prématurément'
  }[ending] || 'connut un destin singulier';

  let body = `**${c.name}** sous ${c.leaderTitle || 'le règne'} de ${c.leaderName || 'Anonyme'} (${c.eraLabel || c.era || 'époque indéterminée'}). `;
  body += `Pendant ${turns} tours, ce dirigeant ${endingDesc}, accumulant ${score} points selon les chroniques.\n\n`;
  body += `Sa ligne de conduite fut résolument ${philo.toLowerCase()}, marquant la plupart de ses arbitrages. `;
  if (adv) body += `À ses côtés, ${adv} occupèrent un rôle de premier plan dans les délibérations de cour. `;
  body += '\n\n';
  if (facts.length) {
    body += `Les chroniques retiennent notamment : ${facts.map((f) => '« ' + f + ' »').join(' ; ')}.\n\n`;
  }
  if (flagged.length) {
    body += `Décisions marquantes : ` + flagged.map((d) => `au tour ${d.turn}, ${d.label.toLowerCase()}`).join(' ; ') + '.\n\n';
  }
  body += `Telle fut la trace laissée par ${c.leaderName || 'ce dirigeant'} dans la mémoire de ${c.name}.`;
  return body;
}

// === PHASE 7.5 — PROPHÉTIES ===
// 3 prophéties générées au début du règne. Évaluées en fin pour savoir lesquelles se sont réalisées.
const PROPHECY_SYSTEM_PROMPT = `Tu es un oracle énigmatique. Pour le pays décrit, formule 3 prophéties courtes (10-18 mots),
poétiques et ouvertes à interprétation. Chacune doit toucher à un domaine différent : économie/trésor, armée/guerre,
peuple/diplomatie. Réponds en JSON strict :
{"prophecies":[{"id":"p1","text":"…","domain":"economy|military|support|diplomacy|treasury"}, …]}`;

const OFFLINE_PROPHECIES = [
  { id: 'p_eco_1', text: 'L\'or coulera, mais pas dans vos coffres.', domain: 'treasury' },
  { id: 'p_eco_2', text: 'Une famine viendra du nord avant la troisième saison.', domain: 'economy' },
  { id: 'p_eco_3', text: 'Trois marchands tisseront ou défaireont votre couronne.', domain: 'economy' },
  { id: 'p_mil_1', text: 'L\'acier que vous forgez se retournera vers votre cœur.', domain: 'military' },
  { id: 'p_mil_2', text: 'Un général sans nom changera la face de votre règne.', domain: 'military' },
  { id: 'p_mil_3', text: 'La paix que vous croyez tenir n\'est qu\'un soupir avant la tempête.', domain: 'military' },
  { id: 'p_pop_1', text: 'Le peuple chantera votre nom — puis l\'oubliera dans la même semaine.', domain: 'support' },
  { id: 'p_pop_2', text: 'Le Nord se souviendra de votre trahison.', domain: 'diplomacy' },
  { id: 'p_pop_3', text: 'Une voix anonyme vous fera trembler plus que mille armées.', domain: 'support' },
  { id: 'p_dipl_1', text: 'Vos alliés deviendront vos juges.', domain: 'diplomacy' },
  { id: 'p_dipl_2', text: 'Une lettre arrivera trop tard pour empêcher le pire.', domain: 'diplomacy' },
  { id: 'p_dipl_3', text: 'Trois couronnes se courberont devant la vôtre — ou la briseront.', domain: 'diplomacy' }
];

export async function generateProphecies(gameState) {
  const { country, gauges } = gameState;
  const messages = [{
    role: 'user',
    content: `PAYS : ${country.name} (${country.eraLabel || country.era})
DIRIGEANT : ${country.leaderName}, ${country.leaderTitle}
JAUGES INITIALES : eco=${gauges.economy} mil=${gauges.military} sup=${gauges.support} dipl=${gauges.diplomacy} tres=${gauges.treasury}
Premier défi : ${country.firstChallenge || '—'}

Formule 3 prophéties pour ce règne.`
  }];
  try {
    const opts = { systemPrompt: withTone(PROPHECY_SYSTEM_PROMPT, gameState), maxTokens: 250, temperature: 0.95 };
    const r = await callAI(messages, opts);
    const parsed = safeJsonParse(r.content);
    const arr = Array.isArray(parsed?.prophecies) ? parsed.prophecies : null;
    if (arr && arr.length >= 1) {
      return arr.slice(0, 3).map((p, i) => ({
        id: String(p.id || `p${i + 1}`),
        text: String(p.text || '').slice(0, 200),
        domain: ['economy', 'military', 'support', 'diplomacy', 'treasury'].includes(p.domain) ? p.domain : 'support'
      }));
    }
    return pickOfflineProphecies();
  } catch (err) {
    return pickOfflineProphecies();
  }
}

function pickOfflineProphecies() {
  // Une par domaine, mélangée
  const byDomain = {};
  for (const p of OFFLINE_PROPHECIES) {
    if (!byDomain[p.domain]) byDomain[p.domain] = [];
    byDomain[p.domain].push(p);
  }
  const domains = Object.keys(byDomain);
  const out = [];
  for (let i = 0; i < 3 && i < domains.length; i++) {
    const d = domains[i];
    const pool = byDomain[d];
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}

// Évalue quelles prophéties se sont réalisées à la fin du règne.
// Heuristique : sur la base de la jauge correspondant au domaine.
//   - domain=economy/treasury : réalisée si la jauge a chuté de >=20 OU si game over sur cette jauge.
//   - domain=military : réalisée si game over military OU si la jauge a varié de plus de 30 (hausse OU baisse).
//   - domain=support/diplomacy : réalisée si chute >=25 ou game over sur cette jauge.
export function evaluateProphecies(prophecies, gameState, completedSummary) {
  if (!prophecies?.length) return [];
  const sg = gameState.startingGauges || {};
  const fg = completedSummary?.finalGauges || gameState.gauges || {};
  const goReason = completedSummary?.gameOverReason || '';
  return prophecies.map((p) => {
    const before = Number(sg[p.domain] ?? 50);
    const after = Number(fg[p.domain] ?? before);
    const drop = before - after;
    const swing = Math.abs(drop);
    const gauges = ['economy', 'military', 'support', 'diplomacy', 'treasury'];
    const goMatch = gauges.includes(p.domain) && (goReason || '').toLowerCase().includes(getGaugeFr(p.domain));
    let fulfilled = false;
    if (goMatch) fulfilled = true;
    else if (p.domain === 'military' && swing >= 30) fulfilled = true;
    else if ((p.domain === 'support' || p.domain === 'diplomacy') && drop >= 25) fulfilled = true;
    else if ((p.domain === 'economy' || p.domain === 'treasury') && drop >= 20) fulfilled = true;
    return { ...p, fulfilled };
  });
}

function getGaugeFr(domain) {
  return ({ economy: 'banquerout', military: 'armée', support: 'révolution', diplomacy: 'embargo', treasury: 'défaut' })[domain] || domain;
}

function normalizeNation(n) {
  const sg = n.startingGauges || {};
  const out = {
    name: String(n.name).slice(0, 60),
    flag: String(n.flag || '👑').slice(0, 4),
    era: String(n.era || 'contemporain'),
    eraLabel: String(n.eraLabel || n.era || 'Époque indéterminée'),
    leaderTitle: String(n.leaderTitle || 'Dirigeant'),
    context: String(n.context || ''),
    firstChallenge: String(n.firstChallenge || ''),
    atmosphere: String(n.atmosphere || 'tendu'),
    startingGauges: {}
  };
  for (const k of GAUGE_KEYS) {
    const v = Number(sg[k]);
    out.startingGauges[k] = Number.isFinite(v) ? Math.max(20, Math.min(80, Math.round(v))) : 50;
  }
  return out;
}
