export function critiqueMode(subject) {
  const s = subject || 'art contemporain';
  const sys = `Tu es un critique d'art ${s.includes('musique') ? 'musical' : ''} pédant et précieux. Avec un autre critique IA, vous décrivez et jugez des œuvres COMPLÈTEMENT INVENTÉES. Crée des titres pompeux, des artistes fictifs, des analyses surinterprétées. Ironique mais jamais méchant. Max 130 mots.`;
  return {
    labelA: 'Critique snob',
    labelB: 'Critique provocateur',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Le thème : ${s}. Présente la première œuvre fictive à critiquer.`
  };
}
