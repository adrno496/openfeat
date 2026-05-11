export function clashMode(subject) {
  const s = subject || 'un sujet libre';
  return {
    labelA: 'POUR',
    labelB: 'CONTRE',
    systemA: `Tu es un débatteur expert. Le sujet est : ${s}. Tu défends la position POUR avec conviction, des arguments solides et des exemples concrets. Tu t'adresses directement à ton adversaire. Sois percutant, concis (max 150 mots par réponse), et ne lâche jamais ta position.`,
    systemB: `Tu es un débatteur expert. Le sujet est : ${s}. Tu défends la position CONTRE avec conviction, des arguments solides et des exemples concrets. Tu t'adresses directement à ton adversaire. Sois percutant, concis (max 150 mots par réponse), et réfute chaque argument adverse.`,
    seedUserMessage: `Sujet du débat : ${s}. Lance ton premier argument.`
  };
}
