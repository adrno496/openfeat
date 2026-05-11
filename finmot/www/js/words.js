/**
 * FinMot — Base de données de mots
 * 5 lettres, vocabulaire finance / macro / crypto / géopolitique
 * 100+ mots = ~3 mois de daily à compléter au fil du temps
 */

export const WORDS = [
  // Macro / Finance traditionnelle
  { word: "ACHAT", category: "Trading", definition: "Acquisition d'un actif financier sur le marché." },
  { word: "ACTIF", category: "Comptabilité", definition: "Élément du patrimoine ayant une valeur économique positive." },
  { word: "AGIOS", category: "Bancaire", definition: "Frais perçus par une banque sur un découvert." },
  { word: "AVOIR", category: "Comptabilité", definition: "Crédit en faveur d'un client ou solde positif." },
  { word: "ARRHE", category: "Contrat", definition: "Somme versée à la conclusion d'un contrat." },
  { word: "AUDIT", category: "Finance", definition: "Examen critique des comptes ou des processus." },
  { word: "BILAN", category: "Comptabilité", definition: "État comptable du patrimoine d'une entité." },
  { word: "BANCO", category: "Bancaire", definition: "Argot pour 'banque' ou 'tout va bien' en finance." },
  { word: "CADRE", category: "Économie", definition: "Cadre dirigeant ou cadre réglementaire." },
  { word: "COURS", category: "Marchés", definition: "Prix coté d'un actif sur un marché." },
  { word: "CYCLE", category: "Macro", definition: "Phase récurrente d'expansion ou contraction économique." },
  { word: "CIBLE", category: "Trading", definition: "Niveau de prix visé pour clôturer une position." },
  { word: "COTES", category: "Marchés", definition: "Prix officiels établis sur un marché." },
  { word: "COURT", category: "Trading", definition: "Court terme — horizon de quelques jours à mois." },
  { word: "COTER", category: "Marchés", definition: "Inscrire un titre sur un marché réglementé." },
  { word: "CRISE", category: "Macro", definition: "Période de rupture économique ou financière." },
  { word: "DETTE", category: "Macro", definition: "Engagement financier à rembourser." },
  { word: "DEPOT", category: "Bancaire", definition: "Somme confiée à une banque ou caution." },
  { word: "DELAI", category: "Contrat", definition: "Période accordée pour exécuter une obligation." },
  { word: "DROIT", category: "Marchés", definition: "Droit de souscription, de vote ou de propriété." },
  { word: "DEBUT", category: "Trading", definition: "Ouverture de séance ou début de cycle." },
  { word: "ECART", category: "Trading", definition: "Différence entre deux cours (spread)." },
  { word: "ETATS", category: "Géopolitique", definition: "États souverains, émetteurs de dette publique." },
  { word: "ELITE", category: "Sociologie", definition: "Groupe restreint disposant du capital ou pouvoir." },
  { word: "FONDS", category: "Gestion", definition: "Véhicule d'investissement collectif." },
  { word: "FOREX", category: "Marchés", definition: "Marché des changes (Foreign Exchange)." },
  { word: "FRANC", category: "Devises", definition: "Ancienne monnaie française, encore utilisée en Afrique." },
  { word: "GAINS", category: "Trading", definition: "Profits réalisés sur une position." },
  { word: "GAGES", category: "Bancaire", definition: "Biens donnés en garantie d'une dette." },
  { word: "INDEX", category: "Marchés", definition: "Indice boursier de référence (CAC 40, S&P 500)." },
  { word: "IMPOT", category: "Fiscalité", definition: "Prélèvement obligatoire au profit de l'État." },
  { word: "KRACH", category: "Macro", definition: "Effondrement brutal des cours boursiers." },
  { word: "LIVRE", category: "Devises", definition: "Livre sterling — devise du Royaume-Uni." },
  { word: "LIBOR", category: "Bancaire", definition: "Taux interbancaire de référence (London Interbank)." },
  { word: "LIBRE", category: "Économie", definition: "Libre-échange, marché libre, libre concurrence." },
  { word: "LIMIT", category: "Trading", definition: "Ordre limite — exécuté à un prix maximal." },
  { word: "LONGS", category: "Trading", definition: "Positions longues — pari sur la hausse." },
  { word: "LOYER", category: "Immobilier", definition: "Revenu du capital immobilier — loyer de l'argent = taux." },
  { word: "LEVER", category: "Capital", definition: "Lever des fonds — collecter du capital." },
  { word: "MARGE", category: "Trading", definition: "Capital exigé pour ouvrir une position à effet de levier." },
  { word: "MODES", category: "Marchés", definition: "Modes d'exécution ou modes de cotation." },
  { word: "OFFRE", category: "Marchés", definition: "Quantité disponible à un prix donné." },
  { word: "ORDRE", category: "Trading", definition: "Instruction de marché (achat / vente)." },
  { word: "PERTE", category: "Trading", definition: "Résultat négatif sur une position." },
  { word: "PIVOT", category: "Trading", definition: "Niveau technique central pour le retournement." },
  { word: "PRIME", category: "Marchés", definition: "Prime de risque ou prime d'option." },
  { word: "PRETS", category: "Bancaire", definition: "Crédits accordés par les banques." },
  { word: "PAYER", category: "Bancaire", definition: "Régler une obligation financière." },
  { word: "QUOTA", category: "Régulation", definition: "Limite quantitative imposée (production, importation)." },
  { word: "RATIO", category: "Analyse", definition: "Rapport entre deux grandeurs financières." },
  { word: "RAIDS", category: "M&A", definition: "Tentatives hostiles de prise de contrôle." },
  { word: "RUSSE", category: "Géopolitique", definition: "Économie russe — major producteur d'énergie." },
  { word: "RICHE", category: "Sociologie", definition: "Haut patrimoine — clientèle private banking." },
  { word: "SOLDE", category: "Comptabilité", definition: "Différence entre crédit et débit d'un compte." },
  { word: "TITRE", category: "Marchés", definition: "Valeur mobilière (action, obligation)." },
  { word: "TAXES", category: "Fiscalité", definition: "Prélèvements affectés à des dépenses précises." },
  { word: "TURBO", category: "Marchés", definition: "Produit dérivé à effet de levier élevé." },
  { word: "USURE", category: "Bancaire", definition: "Taux excessif interdit par la loi." },
  { word: "VENTE", category: "Trading", definition: "Cession d'un actif sur le marché." },
  { word: "VENDU", category: "Trading", definition: "Position courte — pari sur la baisse." },

  // Crypto / DeFi
  { word: "ALPHA", category: "Crypto", definition: "Surperformance par rapport à un benchmark." },
  { word: "ASSET", category: "Crypto", definition: "Actif numérique tokenisé." },
  { word: "BLOCS", category: "Crypto", definition: "Blocs de la blockchain — unités de transactions." },
  { word: "BULLS", category: "Marchés", definition: "Investisseurs haussiers (bull market)." },
  { word: "BEARS", category: "Marchés", definition: "Investisseurs baissiers (bear market)." },
  { word: "BONDS", category: "Marchés", definition: "Obligations — dette à revenu fixe." },
  { word: "BOOMS", category: "Macro", definition: "Phases d'expansion économique rapide." },
  { word: "DELTA", category: "Options", definition: "Sensibilité d'une option au prix du sous-jacent." },
  { word: "GAMMA", category: "Options", definition: "Sensibilité du delta au prix du sous-jacent." },
  { word: "GRAAL", category: "Trading", definition: "Stratégie miracle, souvent illusoire." },
  { word: "HEDGE", category: "Gestion", definition: "Couverture — réduction du risque par compensation." },
  { word: "KAPPA", category: "Options", definition: "Sensibilité d'une option à la volatilité (vega)." },
  { word: "LIBRA", category: "Crypto", definition: "Projet stablecoin Meta abandonné en 2022." },
  { word: "MINER", category: "Crypto", definition: "Validateur PoW — extrait des blocs Bitcoin." },
  { word: "POOLS", category: "Crypto", definition: "Pools de liquidité (DEX, AMM)." },
  { word: "PUMPS", category: "Crypto", definition: "Hausses brutales orchestrées (pump & dump)." },
  { word: "SHORT", category: "Trading", definition: "Position vendeuse — pari sur la baisse." },
  { word: "STAKE", category: "Crypto", definition: "Mise en gage de tokens (Proof of Stake)." },
  { word: "STOCK", category: "Marchés", definition: "Action cotée d'une entreprise." },
  { word: "SWAPS", category: "Dérivés", definition: "Échange de flux financiers (taux, devises)." },
  { word: "SIGMA", category: "Risque", definition: "Volatilité — écart-type des rendements." },
  { word: "THETA", category: "Options", definition: "Sensibilité au temps — érosion temporelle." },
  { word: "TOKEN", category: "Crypto", definition: "Jeton numérique sur une blockchain." },
  { word: "TRADE", category: "Trading", definition: "Opération d'achat ou vente sur un marché." },
  { word: "WHALE", category: "Crypto", definition: "Détenteur de très gros montants en crypto." },
  { word: "YIELD", category: "Gestion", definition: "Rendement — revenu généré par un actif." },
  { word: "YUANS", category: "Devises", definition: "Devise chinoise (renminbi)." },

  // Géopolitique / Macro contrarienne
  { word: "ARMES", category: "Géopolitique", definition: "Industrie de la défense — secteur cyclique." },
  { word: "ARABE", category: "Énergie", definition: "Pétrole arabe — OPEP, Saudi Aramco." },
  { word: "BLEUE", category: "Marchés", definition: "Blue chips — actions de grandes capitalisations." },
  { word: "CHINE", category: "Géopolitique", definition: "Deuxième économie mondiale — concurrente du dollar." },
  { word: "INDES", category: "Géopolitique", definition: "Inde — économie émergente majeure du 21e siècle." },
  { word: "NICHE", category: "Économie", definition: "Niche fiscale ou marché de niche." },
  { word: "NOIRE", category: "Économie", definition: "Économie noire — non déclarée." },
  { word: "OTAGE", category: "Géopolitique", definition: "Otage économique — dépendance stratégique." },
  { word: "PETRO", category: "Énergie", definition: "Pétrodollar — système monétaire post-1971." },
  { word: "ROUGE", category: "Trading", definition: "Encre rouge — pertes comptables." },
  { word: "VERTE", category: "ESG", definition: "Économie verte — transition énergétique." },
  { word: "VEGAS", category: "Trading", definition: "Trading spéculatif — analogie avec le casino." }
];

/**
 * Sélectionne le mot du jour de manière déterministe.
 * Tous les utilisateurs voient le même mot le même jour.
 */
export function getDailyWord(date = new Date()) {
  // Date d'origine : 1er janvier 2026
  const origin = new Date(2026, 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceOrigin = Math.floor((today - origin) / (1000 * 60 * 60 * 24));

  // Hash simple pour mélanger l'ordre sans répéter
  const seed = daysSinceOrigin * 2654435761 % WORDS.length;
  const index = ((seed % WORDS.length) + WORDS.length) % WORDS.length;

  return {
    ...WORDS[index],
    dayNumber: daysSinceOrigin + 1
  };
}

/**
 * Vérifie si un mot existe dans le dictionnaire (pour valider les essais).
 * Pour MVP : on accepte tous les mots de 5 lettres dans la liste +
 * une liste étendue de mots français courants à fournir plus tard.
 */
export function isValidGuess(guess) {
  const upper = guess.toUpperCase();
  // MVP : on accepte si dans notre liste OU si 5 lettres alphabétiques
  // (À durcir avec un dico FR complet pour éviter les non-mots)
  if (WORDS.some(w => w.word === upper)) return true;
  // Liste blanche supplémentaire de mots FR courants à 5 lettres
  // pour permettre des essais sans frustration
  return EXTRA_VALID_WORDS.has(upper);
}

// Mots français courants acceptés comme essais valides
// (mais qui ne seront jamais le mot du jour)
const EXTRA_VALID_WORDS = new Set([
  "AIMER","AIDER","ALLER","AVION","ARBRE","AUTRE","AVANT","ANGLE","ANIME",
  "BLEUE","BLANC","BOITE","BRAVE","BRUIT","BIENS","BARGE","BANDE","BOITS",
  "CARTE","CHAIR","CHEMIN","CHEFS","CIELS","CHANT","CHEZ","CHANT","CLAIR",
  "DANSE","DEMAI","DROLE","DOUTE","DOUBLE","DROIT","DENTS",
  "ECOLE","EGARE","ELIRE","ENTRE","EQUIP","ERMIT","ETUDE","ETERN",
  "FACES","FATAL","FAVOR","FERME","FETER","FINIR","FLOTS","FORTS","FRAIS","FREIN","FRUIT",
  "GLACE","GLOIR","GRAVE","GUIDE",
  "HEROS","HONTE","HUILE","HUMER",
  "IDEAL","ILEUS","IMAGE","IRONI",
  "JADIS","JUGER","JUSTE",
  "LARGE","LATIN","LIONS","LIEU","LIVRE","LOUER",
  "MADAM","MAIRE","MAJOR","MARIA","MASSE","MATIN","MELON","MIDIS","MINCE","MORAL","MOTUS",
  "NOTRE","NUEES","NUITS",
  "OASIS","OBLIG","OFFRE","OISIF","OPTAR","OPERA","OUVRE",
  "PAIRE","PALMES","PANTS","PARMI","PARLE","PASSE","PATIO","PAUSE","PAYES","PEINE","PELER","PELLE","PERLE","PHASE","PHYSI","PIANO","PIECE","PIRES","PLACE","PLAGE","PLAIN","PLANS","PLATS","PLEIN","PLUME","POIDS","POIRE","POLIR","POMME","PONTS","PORTS","POSER","POSTE","POULE","POUSS","PRESS","PRIER","PRINT","PROUD","PUMPS",
  "QUART","QUEUE","QUEST",
  "RACES","RAGER","RAMER","RANGE","RAPID","RARES","RAYON","REINE","RENDU","REVUE","RIDER","RIENS","RIVES","ROBES","ROCHE","ROIS","ROMAN","ROUGE","ROUTE","RUDES","RUSES",
  "SABRE","SACRE","SAGES","SAINS","SAISI","SALES","SALON","SALUT","SANTE","SAUTE","SAVON","SCENE","SECRE","SEINE","SEMER","SENTE","SERRE","SERTI","SEULS","SEVRE","SIGNE","SILEX","SINGE","SOIES","SOIRS","SOMME","SONGE","SORTE","SOUFL","SOULS","SOUPE","STARS","SUEDE","SUITE","SURFE","SYRIE",
  "TABLE","TACHE","TANTE","TAPIS","TARDS","TEMPS","TENIR","TENTE","TERME","TERRE","TESTS","TETUE","TIGRE","TIRES","TISER","TOMBE","TONNE","TOQUE","TOUCH","TOURS","TRAIN","TRIER","TROIS","TUERS",
  "UNITE","USAGE",
  "VAGUE","VAINS","VANTE","VEINE","VENIR","VERRE","VIDEO","VIEUX","VILLE","VIOLE","VITES","VIVRE","VOEUX","VOILE","VOIRE","VOLON","VOTER","VOTRE","VOYEZ"
]);
