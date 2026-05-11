const ALIBIS = [
  "j'étais au cinéma seul ce soir-là",
  "je dînais chez ma grand-mère",
  "je travaillais tard au bureau",
  "j'étais à un concert avec un ami",
  "j'étais malade chez moi"
];
const NAMES = ['Marc Dubois', 'Sophie Laurent', 'Karim Benali', 'Eva Marchand', 'Théo Petit'];

export function interrogatoireMode(subject) {
  const crime = subject || 'un cambriolage';
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const alibi = ALIBIS[Math.floor(Math.random() * ALIBIS.length)];
  const guilty = Math.random() < 0.5;

  return {
    labelA: 'Suspect',
    labelB: 'Détective',
    systemA: `Tu joues ${name}, suspecté de ${crime}. Ton alibi : ${alibi}. Tu es ${guilty ? 'COUPABLE' : 'INNOCENT'}. ${guilty ? 'Cache-le avec des demi-vérités, des explications floues, des contradictions subtiles.' : 'Défends-toi sincèrement mais reste nerveux face à l\'autorité.'} Max 100 mots. Ne révèle JAMAIS ton statut directement.`,
    systemB: `Tu interroges ${name}, suspecté de ${crime}. Pose des questions précises, croise les informations, cherche les contradictions dans son alibi. Sois professionnel mais incisif. Après plusieurs échanges, formule une conclusion : coupable ou innocent, avec tes preuves. Max 100 mots.`,
    seedUserMessage: `M./Mme ${name}, asseyez-vous. Vous savez pourquoi vous êtes ici. Racontez-moi où vous étiez au moment des faits.`
  };
}
