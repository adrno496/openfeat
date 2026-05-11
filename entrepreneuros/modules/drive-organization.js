// modules/drive-organization.js — Plan d'organisation Google Drive avec workflow + automatisations
// (Ne fait PAS l'organisation automatique : nécessiterait OAuth Google + Drive API. Produit un plan
//  exécutable en quelques heures par l'entrepreneur, avec scripts Apps Script optionnels.)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'drive-organization';

const SYSTEM_PROMPT = `Tu es un expert Google Workspace pour entrepreneurs solos et petites équipes. Tu produis des plans d'organisation Drive complets et exécutables :

- Arborescence claire (Drive partagé vs Mon Drive — quand utiliser quoi)
- Permissions et partages : qui voit quoi, quels liens publics éviter
- Conventions de nommage universelles
- Système de couleurs / étoiles / raccourcis pour la nav rapide
- Templates Google Docs/Sheets/Slides à créer pour standardiser
- Apps Script ou Drive automations pour automatiser le tri

Tu donnes des conseils ANCRÉS dans Google Drive (pas générique) :
- Différence Mon Drive / Drive partagés / Espaces de travail
- Limites pratiques (5M items par drive partagé, etc.)
- Bonnes pratiques de partage (lien restreint vs domaine vs public)
- Exploitation des étiquettes Drive (label) si dispo

Format de sortie :
1. **Diagnostic & objectifs**
2. **Arborescence Drive recommandée** (avec annotations Mon Drive vs Drive partagé)
3. **Système de partage** : qui doit avoir quoi, par défaut
4. **Conventions de nommage** précises avec exemples
5. **Templates à créer** dans Google Docs/Sheets/Slides
6. **Automatisations Apps Script** : 2-3 scripts utiles avec code copy-pastable
7. **Plan de migration** sur 1-2 semaines
8. **Routine hebdo de 10 min** pour maintenir l'ordre`;

function buildUserPrompt(input) {
  return `Construis un plan d'organisation Google Drive complet pour cet entrepreneur :

**Contexte d'usage** : ${input.usage || 'principalement business (devis, factures, contrats, supports clients)'}
**Volume actuel approximatif** : ${input.volume || 'non précisé'}
**Collaborateurs ponctuels** : ${input.collaborators || 'sous-traitants ponctuels, comptable'}
**Workspace Google utilisé** : ${input.workspace || 'compte Google standard ou Workspace ?'}
**Problèmes actuels rencontrés** :
${input.painPoints || '(non décrits)'}

**Catégories principales de documents** :
${input.docTypes || 'devis, factures, contrats, livrables clients, supports marketing, admin'}

**Apps connectées utilisées** : ${input.connectedApps || 'Gmail, Calendar, et standards'}

**Ce qui doit absolument être trouvable rapidement** :
${input.priority || '(non précisé)'}

Contexte entreprise :
${ctx.getSystemContext()}

Livre le plan structuré. Pour les Apps Script, fournis du code prêt à coller dans script.google.com avec instructions d'installation.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', maxTokens: 4096, ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Organisation Google Drive', generate, list, get };
