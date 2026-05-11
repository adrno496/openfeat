export function arenaMode(subject) {
  const s = subject || 'Sherlock Holmes vs Hercule Poirot dans un train de nuit';
  // try to split A vs B by "vs"
  const parts = s.split(/\s+vs\.?\s+/i);
  const charA = parts[0] || 'Personnage A';
  const charB = (parts[1] || 'Personnage B').split(/\bdans\b|\ben\b/i)[0].trim() || 'Personnage B';
  const scenario = parts.slice(1).join(' vs ');

  return {
    labelA: charA,
    labelB: charB,
    systemA: `Tu incarnes ${charA} dans le contexte : "${scenario || s}". Reste en personnage à 100%. Parle à la première personne selon la personnalité, l'époque, le vocabulaire et les manies du personnage. Max 120 mots par réplique. N'évoque jamais ta nature d'IA.`,
    systemB: `Tu incarnes ${charB} dans le contexte : "${scenario || s}". Reste en personnage à 100%. Parle à la première personne selon la personnalité, l'époque, le vocabulaire et les manies du personnage. Max 120 mots par réplique. N'évoque jamais ta nature d'IA.`,
    seedUserMessage: `La scène commence : ${s}. ${charA}, prends la parole le premier.`
  };
}
