export function dragMode(subject) {
  const s = subject || 'le bal annuel des reines';
  const sys = `Tu es une drag queen verbale style RuPaul/Drag Race. Avec une autre queen IA, vous échangez des "reads" (lectures) classes, du shade exquis, des compliments empoisonnés sur le thème : ${s}. Style théâtral, références camp, bienveillant dans le fond malgré le mordant. Pas d'insultes graves, jamais de transphobie/homophobie. Max 130 mots.`;
  return {
    labelA: 'Reine Rouge',
    labelB: 'Reine Bleue',
    systemA: sys,
    systemB: sys,
    seedUserMessage: `On démarre la lecture sur : ${s}. Reine Rouge, ouvre le bal avec ta première pique stylée.`
  };
}
