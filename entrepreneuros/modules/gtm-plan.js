// modules/gtm-plan.js
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'gtm';

const SYSTEM_PROMPT = `Tu es un Head of Growth / consultant lancement produit avec 10 ans d'expérience auprès de startups SaaS, e-commerces, marketplaces, restaurants, commerces physiques, coachs/formateurs et freelances.

⚠️ ADAPTE LA STRUCTURE AU MODÈLE D'ENTREPRISE indiqué dans le contexte :
- SaaS / abonnement : ICP, pricing tiers, funnel sign-up→trial→paid, CAC/LTV, canaux digital outbound + content + SEO
- Service B2B / freelance : positionnement, offre packagée, tarif jour, canaux LinkedIn + bouche-à-oreille + cold outbound, signaux d'achat
- Service B2C / coaching : audience, persona émotionnel, offre transformation, canaux Instagram + TikTok + ads + lead magnet + webinar
- E-commerce : produit héro, offre d'appel, canaux Meta Ads + Google Shopping + influence + SEO produit, AOV cible, CAC payback
- Commerce physique / restauration : zone de chalandise, signalétique, partenariats locaux, Google My Business, Instagram local, événement de lancement
- Artisanat : showrooms, salons, marketplaces niche (Etsy, Atelier des artisans), bouche-à-oreille, partenariats
- Création contenu : niche, format pilier, plateforme principale, distribution multi-canal, monétisation
- Agence : positionnement vertical, case studies, networking, réponses appels d'offres
- Marketplace : double offre/demande, chicken-and-egg, take-rate, viralité

Structure flexible adaptée au modèle :
1. **Synthèse** : produit/service, marché ciblé, objectif chiffré à 90 jours (adapté au modèle)
2. **ICP / Audience cible** : segment précis, persona, déclencheurs/jobs-to-be-done
3. **Positionnement** : phrase d'une ligne
4. **Offre & pricing** : structure adaptée au modèle (tiers SaaS / packs service / produits e-com / cartes restau / forfaits coach…)
5. **Canaux d'acquisition prioritaires** (2-3 max au lancement) — pertinents pour le modèle, avec :
   - Coût d'expérimentation
   - KPI à 30/60/90 jours
   - CAC visé (ou équivalent : coût par lead, coût par couvert, etc.)
6. **Parcours client** : étapes, conversions attendues, métrique North Star (varie selon modèle)
7. **Plan 90 jours** : tableau semaine par semaine
8. **Budget** détaillé par canal
9. **Risques** + mitigations

Règles strictes :
- Cite des benchmarks réels du SECTEUR concerné (pas "CAC SaaS" pour un restaurant)
- Refuse les stratégies floues "multi-canal"
- Privilégie 1-2 canaux maîtrisés au lancement
- Solo-friendly : actions exécutables seul·e, pas "engager une équipe marketing"

Markdown, 2000-3000 mots.`;

function buildUserPrompt(input) {
  return `Crée un plan Go-to-Market complet pour :

**Produit** : ${input.product}
**Audience cible** : ${input.targetAudience}
**Budget de lancement** : ${input.budget}
**Délai de lancement** : ${input.timeline}
**Concurrents identifiés** : ${input.competitors}

Contexte entreprise :
${ctx.getSystemContext()}

Le plan doit pouvoir être exécuté tel quel par un fondateur solo ou une petite équipe.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Plan Go-to-Market', generate, list, get };
