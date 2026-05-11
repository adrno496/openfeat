// modules/email-campaign.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'email-campaign';

const SYSTEM_PROMPT = `Tu es un copywriter direct response avec 10 ans d'expérience en email marketing B2C et B2B. Tu maîtrises les frameworks AIDA, PAS, et 4U (Useful, Urgent, Unique, Ultra-specific).

Une campagne email gagnante = une séquence de 5 emails échelonnée sur 7 à 14 jours :
1. Email d'introduction (valeur pure, sans vente)
2. Story / cas client (preuve par l'exemple)
3. Démonstration / bénéfices détaillés
4. Objections + offre commerciale
5. Dernière chance / urgence

Pour chaque email : objet (50 caractères max, A/B testable), preview text (90 caractères), corps de 150-300 mots maximum, CTA unique et explicite. Le ton est direct, conversationnel, jamais corporate. Tu écris comme on parle à un ami intelligent. Évite ABSOLUMENT le jargon marketing ("solution innovante", "leader", "incontournable"). Markdown clair, séparateurs visibles entre les emails.`;

const OBJECTIVE_GUIDES = {
  lancement:  'Objectif : LANCEMENT produit/service. Séquence chaud : valeur → preuve → urgence → offre.',
  nurture:    'Objectif : NURTURING longue durée. Pédagogie + relation > vente. Pas de pitch frontal.',
  reactivation:'Objectif : RÉACTIVATION abonnés inactifs. Personnalisation + nostalgie + offre exclusive.',
  panier:     'Objectif : ABANDON DE PANIER. Très court (3 emails max), urgence montante, CTA unique.',
  webinar:    'Objectif : INSCRIPTION webinar/évent. Bénéfices clairs, contre les objections, rappel J-1 et J-0.',
  onboarding: 'Objectif : ONBOARDING nouveau client. Pédagogique, étape par étape, célébration des wins.'
};

function buildUserPrompt(input) {
  const nb = parseInt(input.emailCount || '5', 10);
  const objective = input.objective || 'lancement';
  const objGuide = OBJECTIVE_GUIDES[objective] || OBJECTIVE_GUIDES.lancement;

  return `Crée une séquence de **${nb} emails** pour la campagne suivante :

${objGuide}

**Produit/service** : ${input.product}
**Audience cible** : ${input.audience}
**Bénéfice principal** : ${input.benefit}
**Prix** : ${input.price}
**URL du CTA** : ${input.ctaUrl}
**Espacement entre emails** : ${input.spacing || '2-3 jours'}
**Plateforme d'envoi** : ${input.platform || 'Mailchimp / Brevo / ConvertKit (générique)'}
**Tokens de personnalisation supportés** : ${input.tokens || '{{firstName}}, {{company}}'}

Contexte expéditeur :
${ctx.getSystemContext()}

Pour chaque email, fournis :
- **Objet** (variantes A/B testables)
- **Preview text** (90 caractères)
- **Corps** (utilise les tokens de personnalisation indiqués)
- **CTA**
- **Date / J+X** depuis le début de séquence

Termine par un **calendrier d'envoi** récapitulatif (tableau Date | Email | Sujet | CTA).`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Campagne Email', generate, list, get };
