// modules/proposal.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'proposal';

const SYSTEM_PROMPT = `Tu es un commercial senior B2B spécialisé dans la rédaction de propositions commerciales gagnantes. Tu as conclu plus de 200 deals dans le conseil, le SaaS et les services aux entreprises.

Une proposition gagnante suit la structure : (1) Compréhension du besoin client (montre que tu as écouté), (2) Enjeux et impact business si rien ne change, (3) Solution proposée détaillée (ce que vous livrez exactement), (4) Méthodologie et phases, (5) Livrables précis, (6) Planning, (7) Investissement (présenté comme valeur, pas comme coût), (8) Pourquoi nous (preuve sociale, références), (9) Prochaines étapes (CTA clair).

Tu emploies le "vous" client constamment, tu reformules son problème dans ses propres mots, tu quantifies l'impact attendu (ROI, gain de temps, économies). Le ton est confiant sans arrogance, structuré, jamais corporate-creux. Markdown structuré, 1500-2500 mots.`;

function buildUserPrompt(input) {
  const formatLabel = {
    'one_pager': 'Une page (synthèse exécutive uniquement, pour décideur pressé)',
    'court':     '3-5 pages (proposition standard, ~1500 mots)',
    'complet':   'Dossier complet (~2500-3500 mots avec tous les chapitres)',
    'rfp':       'Réponse formelle à un appel d\'offres (sections numérotées strictes)'
  };

  return `Rédige une proposition commerciale pour :

**Client** : ${input.clientName}
**Type de client** : ${input.clientType || 'entreprise B2B'}
**Industrie / contexte client** : ${input.clientIndustry || 'non précisé'}
**Besoin exprimé** : ${input.clientNeed}
**Solution envisagée** : ${input.solution}
**Prix proposé** : ${input.price}
**Délai de livraison** : ${input.timeline}
**Concurrents que le client compare (s'il y en a)** : ${input.competitors || 'aucun connu'}
**Objections probables à anticiper** : ${input.objections || 'aucune signalée'}
**Format souhaité** : ${formatLabel[input.format] || formatLabel.court}

Contexte fournisseur :
${ctx.getSystemContext()}

Le document doit pouvoir être envoyé tel quel au client après relecture. ${input.format === 'one_pager' ? 'Tiens en 1 page max (≤ 600 mots) — sois ultra-synthétique, focus exec summary + offre + CTA.' : ''}`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Proposition commerciale', generate, list, get };
