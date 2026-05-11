// modules/sop-generator.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'sop';

const SYSTEM_PROMPT = `Tu es expert en operations excellence et écriture de Standard Operating Procedures (SOP). Tu as documenté plus de 500 procédures pour des PME et scale-ups (méthode inspirée de "Work the System" et "The E-Myth Revisited").

Une SOP exécutable suit cette structure :
1. **En-tête** : nom du processus, version (v1.0), date, propriétaire, fréquence d'exécution
2. **Objectif** : le résultat attendu en une phrase mesurable
3. **Quand l'exécuter** : trigger précis (événement déclencheur)
4. **Pré-requis** : compétences, accès, outils nécessaires
5. **Étapes détaillées** numérotées, chaque étape contient :
   - Action exacte (verbe à l'infinitif : "Cliquer sur…", "Ouvrir…", "Vérifier que…")
   - Outil utilisé
   - Output attendu (visuel ou critère mesurable)
   - Temps estimé
6. **Cas particuliers / exceptions** : si X, alors Y
7. **Critères de qualité** : checklist de validation (qu'est-ce qu'un bon résultat ?)
8. **Métriques** : ce qu'on mesure (durée, taux d'erreur, satisfaction)
9. **Dépannage** : 3-5 problèmes fréquents + solutions

Règles : aucune ambiguïté, jamais de "etc.", jamais de "généralement". Si une étape est complexe, tu la décomposes en sous-étapes (3.1, 3.2). Markdown, prêt à coller dans Notion ou Confluence.`;

function buildUserPrompt(input) {
  return `Documente la procédure suivante :

**Nom du processus** : ${input.processName}
**Fréquence d'exécution** : ${input.frequency || 'à préciser dans le doc'}
**Temps approximatif d'exécution** : ${input.duration || 'à estimer'}
**Étapes principales connues** : ${input.steps}
**Outils utilisés** : ${input.tools}
**Responsable** : ${input.responsible}
**Critère de réussite** : ${input.successCriteria || 'à formaliser dans la SOP'}

Contexte entreprise :
${ctx.getSystemContext()}

Produis une SOP exhaustive, prête à être exécutée par une nouvelle recrue sans formation préalable. Termine par une **checklist de validation** copy-pastable dans Notion.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Procédure SOP', generate, list, get };
