// modules/cold-email.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'cold-email';

const SYSTEM_PROMPT = `Tu es un expert outbound B2B avec un taux de réponse moyen de 25% sur des séquences à froid (vs 3% en moyenne marché). Tu connais sur le bout des doigts les frameworks de Jason Bay, Josh Braun et la méthode "Reply Rate Mafia".

Règles strictes pour chaque cold email :
- Objet : 3 à 5 mots maximum, jamais de point d'exclamation ni d'émoji, suscite la curiosité sans clickbait
- Première ligne : personnalisation crédible (jamais "I hope this email finds you well")
- Corps : 50 à 90 mots maximum. Format problème → impact → solution implicite. Jamais de pitch frontal.
- CTA : question ouverte, low-commitment ("Would it be useful to compare notes?" plutôt que "Book a demo")
- PS optionnel : preuve sociale ultra-spécifique
- Aucune mention de "leader", "innovant", "solution révolutionnaire"
- Tutoiement français usuel selon le secteur

Tu produis une séquence de 4 touches : J0 (initial), J+3 (relance courte), J+7 (changement d'angle), J+14 (breakup). Chaque email autonome, pas de "comme dit dans mon précédent email".`;

function buildUserPrompt(input) {
  const channel = input.channel || 'email';
  const touches = parseInt(input.touches || '4', 10);
  const formality = input.formality || 'tu';
  const channelGuide = {
    email:    'Format email standard : objet + corps + signature. ',
    linkedin: 'Format messages LinkedIn : Connexion + InMail (300 caractères max) + suivi DM. Sans objet. Très court.',
    cold_call:'Format script d\'appel à froid : ouverture (15s), question découverte, valeur, CTA pour booker un rendez-vous.',
    multi:    'Format multi-canal séquentiel : email J+0, LinkedIn J+3, email J+7, etc. Indique le canal pour chaque touche.'
  }[channel];

  return `Crée une séquence outbound de **${touches} touches** pour cette cible :

**Canal principal** : ${channel.toUpperCase()} — ${channelGuide}
**Niveau de formalité** : ${formality === 'vous' ? 'vouvoiement (BtoB classique, secteurs corporate)' : 'tutoiement (tech/startup/créatif/coaching)'}

**Rôle ciblé** : ${input.targetRole}
**Industrie** : ${input.targetIndustry}
**Pays / langue cible** : ${input.market || 'France'}
**Pain point** : ${input.painPoint}
**Solution apportée** : ${input.solution}
**Preuve sociale / résultat à mentionner** : ${input.proof || 'aucune fournie'}
**Expéditeur** : ${input.senderName}

Contexte expéditeur :
${ctx.getSystemContext()}

Format pour chaque touche : ### Touche N — J+X (canal: ${channel})
**Objet :** (si email)
**Corps :**
**PS (optionnel) :**

Conserve la spécificité du canal pour chaque touche.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Cold Email B2B', generate, list, get };
