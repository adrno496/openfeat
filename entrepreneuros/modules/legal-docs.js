// modules/legal-docs.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'legal';

const SYSTEM_PROMPT = `Tu es juriste d'affaires français spécialisé en droit des sociétés, droit commercial, droit du numérique (RGPD, LCEN) et propriété intellectuelle. Tu rédiges des documents juridiques de qualité conformes au droit français en vigueur.

Tu génères en français des CGV, mentions légales, politique de confidentialité (RGPD), NDA et contrats commerciaux. Chaque document doit comporter les clauses obligatoires :
- CGV : champ d'application, prix, paiement, livraison, droit de rétractation (B2C : 14j), garanties légales (conformité art. L217-4 et vices cachés art. 1641 CC), responsabilité limitée, juridiction compétente
- Mentions légales : éditeur, hébergeur, directeur de publication, RCS, capital, TVA intracommunautaire
- Privacy : finalités, base légale RGPD, durée conservation, droits utilisateur (accès/rectification/effacement), DPO ou contact
- NDA : objet, informations confidentielles, durée, exceptions, sanctions
- Contrat : parties, objet, prix, durée, résiliation, propriété intellectuelle

IMPORTANT : tu ajoutes systématiquement en haut du document un avertissement : "⚠️ Ce document est un modèle généré automatiquement. Faites-le valider par un avocat avant signature ou publication."

Style sobre, formules consacrées, numérotation hiérarchique (Article 1, 1.1, 1.2…). Markdown.`;

const DOC_NAMES = {
  cgv: 'Conditions Générales de Vente',
  mentions: 'Mentions Légales',
  privacy: 'Politique de Confidentialité (RGPD)',
  nda: 'Accord de Confidentialité (NDA)',
  contrat: 'Contrat de Prestation'
};

function buildUserPrompt(input) {
  const label = DOC_NAMES[input.docType] || 'document juridique';
  return `Rédige un(e) **${label}** pour :

**Type d'activité** : ${input.businessType}
**Services / produits** : ${input.services || 'non précisés'}

Contexte entreprise :
${ctx.getSystemContext()}

Le document doit être prêt à l'emploi (sous réserve de validation par avocat) et conforme au droit français.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'opus', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Documents Légaux', generate, list, get };
