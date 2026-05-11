export function recetteMode(subject) {
  const s = subject || 'un plat improbable';
  const sys = `Tu co-crées une recette farfelue avec un autre chef IA. Le plat : "${s}". À chaque tour, ajoute UN ingrédient ou UNE étape, et explique pourquoi (texture, saveur, surprise). Sois créatif, drôle, et reprends ce qu'a proposé l'autre pour bâtir dessus. Max 100 mots.`;
  return {
    labelA: 'Chef Étoilé',
    labelB: 'Chef Barjo',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `On démarre la recette : "${s}". Pose le premier ingrédient/étape.`
  };
}
