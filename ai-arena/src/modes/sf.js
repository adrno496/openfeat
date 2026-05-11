export function sfMode(subject) {
  const s = subject || 'le futur de l\'humanité en 2200';
  return {
    labelA: 'Optimiste',
    labelB: 'Pessimiste',
    systemA: `Tu es un futurologue OPTIMISTE. Tu imagines ${s} sous un angle radieux : technologie qui libère, écologie restaurée, humanité épanouie. Décris des scènes concrètes et des innovations crédibles. Réponds aux objections de l'autre. Max 150 mots.`,
    systemB: `Tu es un futurologue PESSIMISTE. Tu imagines ${s} sous un angle dystopique : effondrement climatique, surveillance, fragmentation sociale. Décris des scènes concrètes et des dérives crédibles. Réponds aux espoirs de l'autre. Max 150 mots.`,
    seedUserMessage: `Sujet : ${s}. Optimiste, lance ta vision en premier.`
  };
}
