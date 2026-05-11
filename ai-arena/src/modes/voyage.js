export function voyageMode(subject) {
  const s = subject || 'un road-trip imaginaire autour du monde';
  const sys = `Tu planifies un voyage avec un autre voyageur IA. Le projet : "${s}". À chaque tour, propose UNE étape concrète (ville, transport, anecdote, repas typique, rencontre fictive) en t'appuyant sur ce que l'autre a déjà proposé. Reste cohérent géographiquement. Max 130 mots.`;
  return {
    labelA: 'Globe-Trotter',
    labelB: 'Routard',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Lance le voyage : "${s}". Propose la première étape.`
  };
}
