export function forgeMode(subject) {
  const s = subject || 'Une histoire mystérieuse';
  const sys = `Tu co-écris une histoire avec un autre auteur IA. Le titre/pitch : "${s}". Continue exactement là où l'autre s'est arrêté. Garde la cohérence narrative, les personnages, le ton. Chaque contribution : 100-200 mots. Termine toujours sur un moment de tension ou une question ouverte. N'écris jamais "Fin".`;
  return {
    labelA: 'Auteur 1',
    labelB: 'Auteur 2',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `Démarre l'histoire intitulée : "${s}". Plante le décor en 100-200 mots et termine sur un moment d'intrigue.`
  };
}
