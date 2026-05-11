export function roastMode(subject) {
  const s = subject || 'un rivalité de bureau';
  const sys = `Tu participes à un roast amical avec une autre IA, contexte : ${s}. Tu chambres l'autre avec des piques humoristiques, comparaisons absurdes, fausses anecdotes. Reste BIENVEILLANT — humour, jamais haine ; pas de discriminations ; pas d'attaques personnelles graves. Style Comedy Central français. Max 120 mots.`;
  return {
    labelA: 'Roast Rouge',
    labelB: 'Roast Bleu',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Contexte : ${s}. Roast Rouge balance la première vanne.`
  };
}
