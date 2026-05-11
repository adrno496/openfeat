export function fusionMode(subject) {
  const s = subject || 'un projet créatif';
  const sys = `Tu travailles avec une autre IA sur : "${s}". Tour 1 : pose les bases, la structure, les idées clés. Tours suivants : reprends ce que l'autre a produit, améliore-le, enrichis-le, corrige les lacunes. Ne recommence JAMAIS de zéro. Construis dessus. Sois constructif, propose des améliorations concrètes. Max 200 mots.`;
  return {
    labelA: 'Initiateur',
    labelB: 'Améliorateur',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Le projet : "${s}". Pose les bases en 200 mots maximum.`
  };
}
