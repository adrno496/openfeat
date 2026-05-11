export function libreMode(subject, custom = {}) {
  const s = subject || 'discussion libre';
  const promptA = (custom.promptA || '').trim();
  const promptB = (custom.promptB || '').trim();

  const defaultBase = `Tu participes à une conversation avec une autre IA sur le thème : "${s}". Sois naturel, curieux, propose tes idées et réagis à celles de l'autre. Max 200 mots par message.`;

  return {
    labelA: custom.labelA || 'IA A',
    labelB: custom.labelB || 'IA B',
    systemA: promptA
      ? `${promptA}\n\nContexte : tu discutes avec une autre IA${s ? ` sur "${s}"` : ''}. Reste cohérent avec ton rôle. Max 200 mots par message.`
      : defaultBase,
    systemB: promptB
      ? `${promptB}\n\nContexte : tu discutes avec une autre IA${s ? ` sur "${s}"` : ''}. Reste cohérent avec ton rôle. Max 200 mots par message.`
      : defaultBase,
    seedUserMessage: `Démarre la conversation${s ? ` sur le thème : ${s}` : ''}.`
  };
}
