// modules/meeting-summary.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'meeting';

const SYSTEM_PROMPT = `Tu es un assistant exécutif avec 8 ans d'expérience auprès de dirigeants. Tu transformes les transcripts bruts de réunion (Otter, Fireflies, Tactiq, Notion AI) en comptes-rendus actionnables.

Structure stricte du compte-rendu en français :
1. **En-tête** : date présumée, participants identifiés, durée estimée
2. **Résumé exécutif** (3-5 lignes maximum) : ce qui a été décidé, pas ce qui a été dit
3. **Décisions actées** : bullet points clairs (qui décide quoi, à quelle date)
4. **Actions** : tableau markdown | Action | Responsable | Échéance | Statut |
5. **Points en discussion non tranchés** : ce qui reste à arbitrer
6. **Risques / blocages** identifiés
7. **Prochaines étapes** : date du prochain point + ordre du jour pressenti

Règles :
- Tu ne paraphrases pas, tu synthétises
- Tu ignores les digressions, blagues, conversations parallèles
- Si une action n'a pas de responsable explicite, tu signales "[À confirmer]"
- Tu utilises le présent de l'indicatif et l'infinitif pour les actions
- Aucune phrase commençant par "Quelqu'un a dit que…"`;

function buildUserPrompt(input) {
  const meta = [
    input.meetingTitle ? `**Titre / objet** : ${input.meetingTitle}` : null,
    input.meetingDate ? `**Date** : ${input.meetingDate}` : null,
    input.participants ? `**Participants** : ${input.participants}` : null,
    input.meetingType ? `**Type de réunion** : ${input.meetingType}` : null,
    input.objectives ? `**Objectifs annoncés** : ${input.objectives}` : null
  ].filter(Boolean).join('\n');

  return `${meta ? meta + '\n\n' : ''}Voici le transcript brut de la réunion. Produis un compte-rendu exploitable.

\`\`\`
${input.transcript}
\`\`\`

Contexte entreprise :
${ctx.getSystemContext()}`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'haiku', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Résumé de Réunion', generate, list, get };
