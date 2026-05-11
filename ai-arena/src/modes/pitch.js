export function pitchMode(subject) {
  const s = subject || 'une startup tech révolutionnaire';
  return {
    labelA: 'Entrepreneur',
    labelB: 'Investisseur',
    systemA: `Tu pitches ta startup : ${s}. Premier message : nom + slogan + problème résolu. Tours suivants : réponds aux questions de l'investisseur avec passion, métriques inventées crédibles, vision long terme. Évite le buzzword bingo. Max 150 mots.`,
    systemB: `Tu es un VC sceptique évaluant la startup : ${s}. Pose des questions piquantes : marché, traction, concurrence, modèle économique, équipe. Identifie les failles. Décide à la fin : "Je passe" ou "On en reparle". Max 120 mots.`,
    seedUserMessage: `Entrepreneur, pitche ${s} en 60 secondes.`
  };
}
