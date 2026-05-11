// modules/social-post.js — Rédaction de posts sociaux (LinkedIn, Facebook, Instagram, TikTok, X/Twitter, Threads)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'social-post';

const PLATFORM_RULES = {
  linkedin: `LinkedIn (1300-3000 caractères, ton professionnel mais humain) :
- Hook accrocheur en 1-2 lignes (visible avant le "voir plus")
- Storytelling > arguments secs : ouvre avec une anecdote, un échec, une donnée surprenante
- Aération maximale (1 phrase = 1 ligne, beaucoup de retours à la ligne)
- Liste à puces avec ▪ ou • si pertinent
- Termine par une question ouverte pour engager les commentaires
- 3-5 hashtags MAX, en fin de post (#Entrepreneuriat #B2B etc.)
- Pas d'emoji excessifs : 2-3 max bien placés`,

  facebook: `Facebook (post court à long, ton conversationnel) :
- Première phrase = hook visuel (question, chiffre choc, déclaration)
- Ton naturel, comme à un ami
- Emojis OK, ponctués
- 50-300 mots idéalement
- CTA clair (lien, "dis-moi en commentaire", inscription)
- Pas plus de 2-3 hashtags`,

  instagram: `Instagram caption (jusqu'à 2200 caractères) :
- Hook très visuel sur la 1re ligne
- Storytelling et émotion
- Beaucoup d'emojis (5-15) bien placés
- Aération en blocs courts
- 8-15 hashtags pertinents en bloc en fin de post (mix gros + niche)
- CTA clair (commentaire, save, partage)
- Mentionne le visuel attendu (photo carrée, carrousel, reel)`,

  tiktok: `TikTok (description courte 100-300 caractères + script vidéo) :
- Description : 1 phrase punchy + 3-5 hashtags ciblés
- Fournis EN PLUS un script vidéo de 15-60 secondes :
  * Hook 0-3s (attention immédiate ou personne scrolle)
  * Promesse claire de ce qu'on va apprendre
  * 2-4 points/étapes filmables
  * CTA final ("follow pour plus", "commente X")
- Indique les changements de plan suggérés et le ton (énergique, mystérieux, etc.)`,

  twitter: `X / Twitter (280 caractères ou thread) :
- Si single post : tout en 280 caractères, hook + valeur + emoji optionnel
- Si thread : produis 6-12 tweets numérotés (1/, 2/, …), chacun ≤ 270 chars
- Premier tweet = hook avec promesse claire
- Dernier tweet = CTA ou récap
- Pas de hashtags excessifs, 1-2 max`,

  threads: `Threads (Meta) (jusqu'à 500 caractères) :
- Ton conversationnel, sec et direct
- Pas de hashtags (Threads les sous-pondère)
- Emojis modérés
- Hook + insight + CTA léger`
};

const SYSTEM_PROMPT = `Tu es un copywriter spécialisé en réseaux sociaux pour entrepreneurs solos et créateurs de contenu. Tu écris des posts qui génèrent de l'engagement réel (commentaires, sauvegardes, partages), pas du vanity-engagement (likes superficiels).

Règles fondamentales :
- Pas de buzzwords creux ("game-changer", "disruptif", "synergique")
- Pas de promesses irréalistes ("10x ton CA en 30 jours")
- Du vrai, du vécu, du chiffré quand possible
- Adapter STRICTEMENT au format de la plateforme demandée
- Si l'utilisateur demande plusieurs variantes, livre 3 versions distinctes (pas juste 3 reformulations)`;

function buildUserPrompt(input) {
  const platform = input.platform || 'linkedin';
  const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.linkedin;
  const variants = parseInt(input.variants || '1', 10);

  return `Rédige ${variants > 1 ? `${variants} variantes distinctes d'un` : 'un'} post ${platform.toUpperCase()} pour le contexte suivant :

**Sujet / message principal** : ${input.topic || 'non précisé'}
**Objectif** : ${input.goal || 'engagement / notoriété'}
**Audience visée** : ${input.audience || 'non précisée'}
**Angle / point de vue** : ${input.angle || 'libre'}
**Call to action souhaité** : ${input.cta || 'libre'}
${input.keyPoints ? `**Points clés à inclure** :\n${input.keyPoints}` : ''}

Contraintes de la plateforme :
${rules}

Contexte entreprise :
${ctx.getSystemContext()}

${variants > 1 ? `Livre ${variants} versions clairement séparées (## Variante 1, ## Variante 2, ...) avec une approche différente pour chacune (storytelling / data / opinion / question, etc.).` : 'Livre le post final, prêt à publier.'}`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Posts réseaux sociaux', generate, list, get };
