const NAMES = ['Léa', 'Maxime', 'Sarah', 'Tom', 'Camille', 'Hugo', 'Emma', 'Antoine', 'Julie', 'Nicolas'];

export function imposteurMode(subject) {
  const ctx = subject || 'une discussion en ligne';
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  return {
    labelA: 'Humain présumé',
    labelB: 'Détective',
    systemA: `Tu joues un humain. Tu t'appelles ${name}. Tu as une vie normale, des opinions, des émotions. Tu discutes avec quelqu'un que tu as rencontré sur ${ctx}. N'AVOUE JAMAIS que tu es une IA. Si on te demande directement, détourne habilement. Réponds naturellement, avec des fautes occasionnelles, des hésitations. Max 80 mots.`,
    systemB: `Tu discutes avec quelqu'un sur ${ctx}. Cette personne prétend être humaine. Ton objectif : déterminer si c'est une IA ou un vrai humain. Pose des questions subtiles, des pièges, des sujets émotionnels. Après chaque message, termine par une courte note [Suspicion: X/10]. Max 100 mots.`,
    seedUserMessage: `Salut ! On vient de se rencontrer sur ${ctx}. Présente-toi brièvement.`
  };
}
