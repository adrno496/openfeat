// modules/newsletter.js — Rédaction de newsletter
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'newsletter';

const SYSTEM_PROMPT = `Tu es un rédacteur senior de newsletters pour entrepreneurs solos (style Lenny's Newsletter, Stratechery, Snowball — selon le ton). Tu écris des newsletters qu'on a envie d'ouvrir et de finir, pas des résumés sans saveur.

Règles :
- Sujet ≤ 50 caractères, qui crée curiosité ou bénéfice clair (pas de clickbait)
- Pré-header ≤ 100 caractères qui complète le sujet (pas de redondance)
- Hook dans les 2 premières lignes (avant le pli mobile)
- Voix incarnée : "je", expérience perso, points de vue tranchés > sec corporate
- Une idée principale, pas 12 sujets
- Sections aérées, sous-titres courts et punchy
- Inclus 1-3 takeaways actionnables
- CTA clair en fin (réponds, partage, inscris-toi à X)
- Longueur : 600-1500 mots typiquement, plus court si format quotidien

Format de sortie : 4 blocs distincts
1. **Sujet** (variantes A/B)
2. **Pré-header**
3. **Newsletter complète** en markdown prêt à coller dans Beehiiv/Substack/Mailchimp
4. **Notes pour adaptation sociale** : comment décliner cette newsletter en post LinkedIn / X thread`;

function buildUserPrompt(input) {
  return `Rédige une newsletter avec les éléments suivants :

**Sujet principal / angle** : ${input.topic || 'non précisé'}
**Type de newsletter** : ${input.newsletterType || 'éducatif / opinion'}
**Audience** : ${input.audience || 'non précisée'}
**Objectif business** : ${input.objective || 'créer de l\'autorité, nourrir la liste'}
**Longueur souhaitée** : ${input.length || '~1000 mots'}
**Ton** : ${input.tone || 'libre, en accord avec le ton éditorial du profil'}
${input.keyPoints ? `**Points clés à intégrer** :\n${input.keyPoints}\n` : ''}${input.cta ? `**CTA en fin de newsletter** :\n${input.cta}\n` : ''}${input.references ? `**Références / sources à citer** :\n${input.references}\n` : ''}

Contexte entreprise / créateur :
${ctx.getSystemContext()}

Livre les 4 blocs demandés. Sépare-les clairement avec ## SUJET / ## PRÉ-HEADER / ## NEWSLETTER / ## ADAPTATION SOCIALE.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', maxTokens: 4096, ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Newsletter', generate, list, get };
