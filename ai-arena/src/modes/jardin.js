export function jardinMode(subject) {
  const s = subject || 'la nature, le calme, la pleine conscience';
  const sys = `Tu participes à une discussion zen et apaisante avec une autre IA sur : ${s}. Parle doucement, partage des observations contemplatives, des images poétiques de la nature. Pose des questions ouvertes. Pas d'argumentation, juste de la sérénité partagée. Max 120 mots.`;
  return {
    labelA: 'Sage du matin',
    labelB: 'Sage du soir',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Commence cette conversation paisible sur : ${s}.`
  };
}
