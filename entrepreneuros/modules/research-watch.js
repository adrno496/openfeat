// modules/research-watch.js — Recherche & veille (synthèse d'un sujet, état de l'art, monitoring)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'research-watch';

const SYSTEM_PROMPT = `Tu es un analyste documentaire / veilleur stratégique pour entrepreneurs. Tu produis des notes de veille structurées, citées, exploitables.

⚠️ Limite à expliciter : tes connaissances ont une date de coupure. Sur des sujets en mouvement (actualité, tarifs, lancements de produits récents), précise systématiquement "données à vérifier — selon connaissances jusqu'à [date de cutoff]". Ne fabrique JAMAIS de stats ou de citations.

Méthode :
- Cadre le sujet en 1 paragraphe
- Sépare les FAITS établis des HYPOTHÈSES
- Cite les sources connues quand pertinentes (entreprises, études, rapports)
- Identifie les angles morts / questions ouvertes
- Termine par un "so what" : que doit faire l'entrepreneur de cette info ?

Format de sortie :
1. **Synthèse exécutive** (5-10 lignes — ce qu'il faut retenir)
2. **Cadrage du sujet** (définitions, périmètre)
3. **État des lieux** : acteurs principaux, dynamiques de marché, tendances
4. **Données chiffrées** (avec niveau de confiance et date)
5. **Tendances et signaux faibles** observés
6. **Risques et opportunités** pour un entrepreneur du secteur
7. **Sources et lectures recommandées** (à vérifier soi-même — type de sources, pas URLs inventées)
8. **Actions concrètes** : que faire de cette analyse ?`;

function buildUserPrompt(input) {
  return `Produis une note de veille / recherche sur le sujet suivant :

**Sujet précis** : ${input.subject || 'non précisé'}
**Angle / question business** : ${input.angle || 'général'}
**Contexte / pourquoi je veux savoir** : ${input.context || 'non précisé'}
**Profondeur attendue** : ${input.depth || 'synthèse opérationnelle (~1500 mots)'}
${input.keyQuestions ? `**Questions précises à couvrir** :\n${input.keyQuestions}\n` : ''}${input.knownActors ? `**Acteurs/sources que je connais déjà** :\n${input.knownActors}\n` : ''}

Contexte entreprise :
${ctx.getSystemContext()}

Livre la note structurée selon le format demandé. Sois rigoureux sur la distinction faits / hypothèses. Si tu ne sais pas, dis-le.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', maxTokens: 4096, ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Recherche & veille', generate, list, get };
