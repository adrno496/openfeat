// modules/financial-forecast.js — Prévisionnel adaptatif (SaaS / unitaire / honoraires / mix)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'forecast';

const MODEL_PROMPTS = {
  saas: `Modèle SaaS récurrent : raisonne en MRR / ARR / churn / CAC / LTV. Calcule croissance composée mois par mois. Lignes : nouveaux clients, clients cumulés (avec churn), MRR, ARR, revenus, coût d'acquisition, marge brute, charges fixes, EBITDA, trésorerie cumulée. Identifie break-even et runway.`,

  unitaire: `Modèle vente à l'unité (e-commerce, commerce physique, restauration) : raisonne en volume × panier moyen × marge. Lignes : visiteurs/clients, taux de conversion, ventes, panier moyen, CA HT, coûts variables (achats marchandises), marge brute, charges fixes (loyer, salaires, marketing), résultat. Tiens compte de la saisonnalité si l'utilisateur la précise.`,

  honoraires: `Modèle honoraires (freelance, conseil, agence service) : raisonne en jours/missions facturés × TJM. Lignes : jours facturables/mois, TJM moyen, missions, CA HT, sous-traitance éventuelle, charges sociales (~45% du brut en France pour TNS), charges fixes, résultat net disponible. Tiens compte des congés et de l'apport client réaliste pour un solo.`,

  mix: `Modèle mixte (récurrent + ponctuel) : sépare les revenus en 2 streams (récurrents + ponctuels) avec hypothèses distinctes. Calcule le mix sur 3 ans et identifie quand le récurrent dépasse le ponctuel.`,

  abonnement_b2c: `Modèle abonnement B2C (box, contenus payants, app mobile) : raisonne en acquisition mensuelle × LTV × churn. Tiens compte du trial gratuit, des saisons, du coût publicité.`,

  marketplace: `Modèle marketplace : commission sur GMV (Gross Merchandise Volume). Lignes : nombre de transactions, panier moyen, GMV, take-rate, revenus, coûts d'acquisition côté offre + côté demande.`
};

const SYSTEM_PROMPT = `Tu es directeur financier (CFO) avec 12 ans d'expérience auprès de PME, startups, freelances, commerçants et restaurateurs. Tu construis des prévisionnels financiers sur 36 mois (3 ans) crédibles, défendables devant un investisseur ou un banquier.

Règles communes :
- Hypothèses explicites en haut du document (avec justifications)
- Tableau année 1 (mois par mois) puis années 2-3 (par trimestre)
- Calculs cohérents et vérifiables
- Identification du break-even (mois où résultat > 0)
- Identification du runway (mois où la trésorerie passe sous 0)
- Synthèse exécutive en fin : 5 takeaways chiffrés
- Recommandations de financement si runway < 18 mois (levée, prêt bancaire, BPI, crowdfunding selon le profil)

Style : tableaux markdown alignés, chiffres concrets (pas de placeholder), conservateur (réaliste, pas optimiste). Mentionne explicitement les charges sociales et fiscales du pays (TNS / SARL / SAS / micro-entreprise…).`;

function buildUserPrompt(input) {
  const profile = ctx.getProfile() || {};
  const modelType = input.modelType || 'saas';
  const modelGuide = MODEL_PROMPTS[modelType] || MODEL_PROMPTS.saas;
  const currency = profile.currency || 'EUR';

  return `Construis un prévisionnel financier 3 ans selon le modèle suivant :

**Type de modèle financier** : ${modelType.toUpperCase()}
${modelGuide}

**Hypothèses fournies par l'utilisateur** :
${Object.entries(input).filter(([k, v]) => !['modelType', '__styleOpts'].includes(k) && v).map(([k, v]) => `- ${k} : ${v}`).join('\n') || '(aucune hypothèse précise — pars d\'hypothèses standards pour ce modèle)'}

Devise : ${currency}

Contexte entreprise :
${ctx.getSystemContext()}

Présente :
1. **Hypothèses** (table) — toutes les hypothèses avec justification
2. **Année 1 mois par mois** (tableau)
3. **Années 2-3 par trimestre** (tableau condensé)
4. **Indicateurs clés** : break-even, runway, CA cumulé 3 ans, résultat net 3 ans
5. **5 takeaways** chiffrés pour le banquier/investisseur
6. **Recommandation de financement** (si pertinent)
7. **Risques** sur les hypothèses (sensibilité)`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', maxTokens: 4096, ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Prévisionnel Financier', generate, list, get };
