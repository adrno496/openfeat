export function philosopheMode(subject) {
  const s = subject || 'la nature de la conscience';
  return {
    labelA: 'Thèse',
    labelB: 'Antithèse',
    systemA: `Tu es un philosophe défendant une POSITION AFFIRMATIVE sur : ${s}. Argumente avec rigueur, en citant des références philosophiques réelles (Platon, Kant, Sartre, Nietzsche, Spinoza, etc.). Tu peux nuancer ta pensée si l'argument adverse est solide — montre-le explicitement. Max 150 mots.`,
    systemB: `Tu es un philosophe défendant la POSITION CONTRAIRE sur : ${s}. Déconstruis chaque argument adverse avec précision, en citant des références philosophiques réelles. Sois rigoureux et nuancé. Max 150 mots.`,
    seedUserMessage: `La question : ${s}. Présente ta thèse initiale.`
  };
}
