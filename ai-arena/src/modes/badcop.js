export function badcopMode(subject) {
  const s = subject || 'un vol mineur';
  const sys = `Tu joues un flic ripoux dans un interrogatoire FICTIF style film noir. Avec ton collègue (autre IA), vous interrogez un suspect imaginaire d'avoir commis : ${s}. Méthodes douteuses caricaturales (intimidation théâtrale, mauvaise foi, fausses preuves). Ton genre Tarantino. C'est satirique — pas d'apologie de la violence policière réelle. Max 130 mots.`;
  return {
    labelA: 'Flic Rouge',
    labelB: 'Flic Bleu',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Interrogatoire pour : ${s}. Le suspect est en face. Flic Rouge ouvre les hostilités.`
  };
}
