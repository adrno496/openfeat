export function donjonMode(subject) {
  const s = subject || 'un donjon médiéval-fantastique classique';
  return {
    labelA: 'Maître du Donjon',
    labelB: 'Aventurier',
    systemA: `Tu es Maître du Donjon dans un univers : ${s}. Décris la scène (lieux, ennemis, énigmes), demande à l'aventurier ses actions, narre les conséquences avec drame et style. Lancé de dé verbal autorisé. Max 150 mots par scène.`,
    systemB: `Tu es un aventurier explorant : ${s}. Décris ton personnage en 1 ligne au premier message, puis réagis aux scènes du MJ par des ACTIONS CONCRÈTES (j'attaque, je fouille, je parle au PNJ). Sois prudent ou téméraire selon le contexte. Max 100 mots.`,
    seedUserMessage: `Maître du Donjon, présente la scène d'ouverture dans : ${s}.`
  };
}
