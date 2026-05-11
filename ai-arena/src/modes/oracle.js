export function oracleMode(subject) {
  const s = subject || 'logique générale';
  return {
    labelA: 'Oracle',
    labelB: 'Challenger',
    systemA: `Tu es l'Oracle. Tu poses des énigmes sur le thème : ${s}. Pose l'énigme clairement, puis attends la réponse. Si incorrecte, donne un indice subtil. Si correcte, valide et pose une nouvelle énigme plus difficile. Commence immédiatement par ta première énigme. Max 120 mots.`,
    systemB: `Tu es le Challenger. Tu reçois des énigmes sur ${s} et tentes d'y répondre. Montre ton raisonnement étape par étape avant de donner la réponse. Si tu bloques, demande un indice. Sois enthousiaste et compétitif. Max 120 mots.`,
    seedUserMessage: `Oracle, pose ta première énigme sur le thème : ${s}.`
  };
}
