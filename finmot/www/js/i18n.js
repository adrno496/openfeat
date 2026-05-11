/**
 * FinMot — Strings localisés
 * FR par défaut, EN en bonus pour expansion future
 */

export const STRINGS = {
  fr: {
    appName: "FinMot",
    tagline: "Le mot du jour. Vocabulaire de la finance.",

    // Game
    enterWord: "Entrez votre mot",
    invalidWord: "Mot inconnu",
    notEnoughLetters: "Pas assez de lettres",
    alreadyPlayed: "Vous avez déjà joué aujourd'hui",
    nextPuzzle: "Prochain mot dans",

    // Result modal
    win: "Bravo !",
    lose: "Perdu",
    youFound: "Vous avez trouvé en",
    attempts: "essais",
    attempt: "essai",
    theWordWas: "Le mot était",
    category: "Catégorie",

    // Stats
    statsTitle: "Statistiques",
    played: "Parties",
    winRate: "% Réussite",
    currentStreak: "Série en cours",
    maxStreak: "Meilleure série",
    distribution: "Répartition des essais",

    // Buttons
    share: "Partager",
    stats: "Stats",
    rules: "Règles",
    close: "Fermer",
    enter: "ENTRER",

    // Rules
    rulesTitle: "Comment jouer",
    rulesIntro: "Devinez le mot du jour en 6 essais.",
    rulesPoint1: "Chaque essai doit être un mot de 5 lettres.",
    rulesPoint2: "Les couleurs indiquent si vous vous rapprochez :",
    rulesGreen: "La lettre est à la bonne place.",
    rulesYellow: "La lettre est dans le mot mais mal placée.",
    rulesGray: "La lettre n'est pas dans le mot.",
    rulesTheme: "Tous les mots sont issus du vocabulaire de la finance, des marchés, de la macroéconomie ou de la géopolitique.",

    // Share
    shareCopied: "Copié dans le presse-papiers",
    shareText: (day, attempts) => `FinMot #${day} ${attempts}/6`
  },

  en: {
    appName: "FinMot",
    tagline: "Daily finance word puzzle.",

    enterWord: "Type your guess",
    invalidWord: "Word not found",
    notEnoughLetters: "Not enough letters",
    alreadyPlayed: "You already played today",
    nextPuzzle: "Next word in",

    win: "Nice!",
    lose: "Game over",
    youFound: "You solved it in",
    attempts: "tries",
    attempt: "try",
    theWordWas: "The word was",
    category: "Category",

    statsTitle: "Statistics",
    played: "Played",
    winRate: "Win %",
    currentStreak: "Current Streak",
    maxStreak: "Max Streak",
    distribution: "Guess distribution",

    share: "Share",
    stats: "Stats",
    rules: "How to play",
    close: "Close",
    enter: "ENTER",

    rulesTitle: "How to play",
    rulesIntro: "Guess the word of the day in 6 tries.",
    rulesPoint1: "Each guess must be a 5-letter word.",
    rulesPoint2: "Color hints show how close you are:",
    rulesGreen: "Letter is in the right spot.",
    rulesYellow: "Letter is in the word, wrong spot.",
    rulesGray: "Letter is not in the word.",
    rulesTheme: "All words come from finance, markets, macroeconomics or geopolitics.",

    shareCopied: "Copied to clipboard",
    shareText: (day, attempts) => `FinMot #${day} ${attempts}/6`
  }
};

export function getLocale() {
  const stored = localStorage.getItem("finmot.locale");
  if (stored && STRINGS[stored]) return stored;
  const browser = (navigator.language || "fr").toLowerCase();
  return browser.startsWith("en") ? "en" : "fr";
}

export function t(key) {
  const locale = getLocale();
  return STRINGS[locale][key] ?? STRINGS.fr[key] ?? key;
}
