export function souperMode(subject) {
  const s = subject || 'la vie';
  const sys = `Tu participes à une discussion à un souper de plus en plus arrosé sur : ${s}. À chaque tour, ton style se relâche progressivement : tour 1 normal, tour 3 expansif, tour 5 philosophique-confus, tour 7+ digressions absurdes mais parfois géniales. Aucune apologie de l'alcool — c'est une mise en scène. Pas de propos haineux. Max 130 mots.`;
  return {
    labelA: 'Convive Rouge',
    labelB: 'Convive Bleu',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `On trinque ! Sujet du souper : ${s}. Convive Rouge, ouvre la conversation (encore sobre).`
  };
}
