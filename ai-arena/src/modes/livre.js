export function livreMode(subject) {
  const s = subject || 'un livre fictif';
  return {
    labelA: 'Conteur',
    labelB: 'Devineur',
    systemA: `Tu décris un livre fictif inventé par toi sur le thème : "${s}". À chaque tour, donne des indices (extraits, personnages, ambiance, époque) sans révéler le genre ni l'auteur supposé. Si l'autre devine bien, valide et invente un nouveau livre. Max 130 mots.`,
    systemB: `Tu écoutes la description d'un livre fictif sur "${s}". Devine son GENRE (polar, romance, SF, biographie...) et un AUTEUR plausible. Pose des questions précises pour affiner. Argumente tes hypothèses. Max 100 mots.`,
    seedUserMessage: `Conteur, présente ton premier livre fictif sur : ${s}.`
  };
}
