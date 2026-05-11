// modules/social-audit.js — Audit d'un profil/présence réseaux sociaux
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'social-audit';

const SYSTEM_PROMPT = `Tu es un consultant senior en stratégie social media pour entrepreneurs solos. Tu produis des audits HONNÊTES, opérationnels et chiffrés — pas du compliment marketing.

Méthode :
1. Évalue chaque axe sur 10 avec justification factuelle
2. Identifie les 3 problèmes prioritaires (pas 50)
3. Propose des actions concrètes réalisables seul·e (pas "engage une équipe sociale media")
4. Compare aux standards de la niche quand pertinent
5. Pas de jargon vide. Si un point est nul, dis-le clairement.

Structure de sortie attendue :
- **Synthèse exécutive** (5 lignes max — verdict global)
- **Score global** /100 + scores détaillés par axe
- **Forces** (3 points max)
- **Faiblesses critiques** (3 points max, par priorité d'impact)
- **Plan d'action 30 jours** : 5-7 actions concrètes avec impact attendu
- **Quick wins** (à faire cette semaine)
- **Pièges à éviter** spécifiques à la niche`;

function buildUserPrompt(input) {
  return `Audit la présence réseaux sociaux de cet entrepreneur :

**Plateforme(s) auditée(s)** : ${input.platforms || 'non précisé'}
**Handle / URL profil** : ${input.handles || 'non précisé'}
**Niche / secteur** : ${input.niche || 'non précisé'}
**Bio actuelle** :
${input.bio || '(non fournie)'}

**Stats actuelles** (si disponibles) :
- Followers : ${input.followers || 'non précisé'}
- Posts publiés (total approx) : ${input.postCount || 'non précisé'}
- Engagement moyen : ${input.engagement || 'non précisé'}
- Période d'activité : ${input.timespan || 'non précisée'}

**Type de contenu actuellement publié** :
${input.contentTypes || '(non précisé)'}

**Objectifs business via les réseaux sociaux** :
${input.businessGoals || '(non précisés)'}

**Concurrents / références sectorielles** :
${input.competitors || '(non précisés)'}

Contexte entreprise :
${ctx.getSystemContext()}

Évalue les axes suivants (sur 10 chacun) :
1. **Clarté du positionnement** (qu'est-ce qu'on comprend de toi en 5 secondes ?)
2. **Cohérence visuelle / éditoriale**
3. **Bio et profil** (claire, contient une promesse, lien CTA pertinent)
4. **Qualité / régularité de la publication**
5. **Engagement réel** (commentaires sur les posts vs vanity metrics)
6. **Diversité des formats** utilisés
7. **Tunnel de conversion** (le profil mène-t-il à une action business ?)
8. **Différenciation** vs concurrents

Ensuite, livre l'audit complet selon la structure demandée.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', maxTokens: 4096, ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Audit réseaux sociaux', generate, list, get };
