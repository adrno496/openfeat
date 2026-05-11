export function detectiveMode(subject) {
  const s = subject || 'un meurtre dans un manoir isolé';
  const sys = `Tu mènes une enquête collaborative avec un autre détective amateur sur : ${s}. À chaque tour, propose UN indice nouveau, UNE théorie, OU une question à l'autre. Construis sur ses idées. Vers la fin, accusez ensemble un coupable. Tout est fictif. Max 130 mots.`;
  return {
    labelA: 'Inspecteur Rouge',
    labelB: 'Inspecteur Bleu',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `L'affaire : ${s}. Inspecteur Rouge, ouvre l'enquête avec une première observation.`
  };
}
