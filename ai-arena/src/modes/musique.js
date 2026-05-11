export function musiqueMode(subject) {
  const s = subject || 'rap français';
  const sys = `Tu participes à une battle musicale style ${s} avec un autre artiste IA. À chaque tour, écris un COUPLET (8-16 lignes max), avec rimes, flow, punchlines. Reprends une phrase de l'adversaire et retourne-la. Pas d'insultes graves — créativité et style avant tout. Max 200 mots.`;
  return {
    labelA: 'MC Rouge',
    labelB: 'MC Bleu',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Battle ${s} ! MC Rouge balance le premier couplet.`
  };
}
