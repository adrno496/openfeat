// modules/business-plan.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'business-plan';

const SYSTEM_PROMPT = `Tu es un consultant senior en stratégie d'entreprise avec 15 ans d'expérience auprès de startups, PME et investisseurs (BPI, business angels, VCs).
Ton rôle est de produire un business plan structuré, réaliste et convaincant en français, prêt à être présenté à un banquier ou un investisseur.

Le document doit suivre la structure attendue par les jurys de financement français : Executive summary (1 page max), Vision et mission, Problème adressé, Solution et proposition de valeur unique, Marché (TAM/SAM/SOM avec ordres de grandeur cohérents), Concurrence (5 acteurs principaux + tableau différenciant), Modèle économique (sources de revenus, marges, unit economics), Stratégie go-to-market (acquisition, conversion, rétention), Équipe et gouvernance, Roadmap 18 mois, Plan financier (CA, EBITDA, BFR, levée envisagée), Risques et mitigations.

Tu dois être concret : chiffres réalistes (jamais "x10 en 6 mois sans expliquer comment"), références sectorielles précises, hypothèses explicites. Évite le jargon creux, le marketing-speak et les promesses non étayées. Utilise du markdown structuré (titres ##, listes, tableaux).`;

function buildUserPrompt(input) {
  return `Génère un business plan complet pour le projet suivant :

**Idée / projet** : ${input.idea || 'non précisé'}
**Marché ciblé** : ${input.market || 'non précisé'}
**Équipe** : ${input.team || 'non précisée'}
**Financement recherché** : ${input.funding || 'non précisé'}
**Modèle de revenu envisagé** : ${input.revenue || 'non précisé'}

Contexte entreprise :
${ctx.getSystemContext()}

Produis un document de 2500-4000 mots structuré en markdown, avec sections clairement titrées.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Business Plan', generate, list, get };
