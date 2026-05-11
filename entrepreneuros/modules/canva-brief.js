// modules/canva-brief.js — Génère un brief de visuel + prompt utilisable dans Canva (texte, dimensions, couleurs)
// Note : Canva n'a pas d'API publique pour générer des visuels en 1 clic depuis l'extérieur sans OAuth Connect.
// Ce module produit un brief complet qu'on copie-colle dans Canva (Magic Studio / templates).
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'canva-brief';

const SYSTEM_PROMPT = `Tu es un directeur artistique / designer pour entrepreneurs solos. Tu produis des briefs visuels précis qu'un non-designer peut exécuter dans Canva en 10 minutes.

Tes briefs sont :
- Concrets : dimensions exactes, couleurs (hex ou nom), typo (Canva-friendly), placement
- Réalistes : utilisable avec les templates Canva gratuits ou Pro standards
- Hiérarchisés : titre principal, sous-titre, accent, CTA — clairement séparés
- Adaptés à la plateforme finale (post LI ≠ story IG ≠ thumbnail YT)

Tu livres aussi :
- Un prompt copy-pastable pour Canva Magic Studio (génération IA)
- Une recherche de templates : mots-clés exacts à taper dans Canva
- Des alternatives si l'utilisateur n'a pas Canva Pro`;

const FORMAT_SPECS = {
  'post-linkedin':    'LinkedIn post carré 1080×1080 ou portrait 1080×1350',
  'post-instagram':   'Instagram feed carré 1080×1080',
  'story':            'Story (IG/FB) verticale 1080×1920',
  'reel-cover':       'Reel/TikTok cover verticale 1080×1920',
  'thumbnail-yt':     'YouTube thumbnail 1280×720',
  'banniere-li':      'LinkedIn cover bannière 1584×396',
  'carrousel-li':     'Carrousel LinkedIn (6-10 slides 1080×1350)',
  'carrousel-ig':     'Carrousel Instagram (6-10 slides 1080×1080)',
  'document':         'Document A4 portrait',
  'autre':            'Format libre — préciser dans la description'
};

function buildUserPrompt(input) {
  const format = FORMAT_SPECS[input.format] || FORMAT_SPECS['post-linkedin'];
  return `Crée un brief visuel exécutable dans Canva pour :

**Format / support** : ${format}
**Objectif du visuel** : ${input.objective || 'non précisé'}
**Sujet / message principal** : ${input.message || 'non précisé'}
**Texte principal à afficher** : ${input.mainText || 'à proposer'}
**Sous-texte / éléments secondaires** : ${input.subText || '(libre)'}
**CTA visible sur le visuel** : ${input.cta || 'aucun'}
**Style souhaité** : ${input.style || 'minimaliste, professionnel'}
**Couleurs imposées** : ${input.colors || 'libre — proposer une palette cohérente avec le profil'}
**Référence / inspiration** : ${input.reference || 'aucune'}

Contexte entreprise :
${ctx.getSystemContext()}

Livre :

## 1. Spécifications techniques
- Dimensions exactes (px)
- Marges/safe areas
- Typo Canva recommandée (titre + corps) avec tailles en pt
- Palette couleurs (3-4 couleurs hex) avec rôle (fond, accent, texte)

## 2. Composition & hiérarchie
- Description précise de l'agencement (où va chaque élément)
- Hiérarchie visuelle (le regard doit aller où d'abord ?)

## 3. Contenu textuel exact
- Titre principal (mot pour mot)
- Sous-titre / accroche
- CTA si présent

## 4. Recherche de template Canva
- 3-5 mots-clés à taper dans la barre de recherche Canva pour trouver des templates de base à adapter

## 5. Prompt Canva Magic Studio (IA)
- Prompt prêt à coller dans "Magic Design" pour générer une première version

## 6. Alternatives sans Canva Pro
- Templates gratuits suffisants ? Lesquels ?
- Si besoin Pro, justifier (élément spécifique nécessaire)`;
}

function canvaSearchURL(message, format) {
  const formatTerm = {
    'post-linkedin': 'linkedin post',
    'post-instagram': 'instagram post',
    'story': 'instagram story',
    'reel-cover': 'reel cover',
    'thumbnail-yt': 'youtube thumbnail',
    'banniere-li': 'linkedin banner',
    'carrousel-li': 'linkedin carousel',
    'carrousel-ig': 'instagram carousel',
    'document': 'document a4',
    'autre': ''
  }[format] || '';
  const q = encodeURIComponent(`${formatTerm} ${(message || '').slice(0, 40)}`.trim());
  return `https://www.canva.com/templates/?query=${q}`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  const link = canvaSearchURL(input.message, input.format);
  const finalContent = content + `\n\n---\n\n## 🔗 Liens directs\n- [Rechercher des templates Canva](${link})\n- [Canva Magic Studio](https://www.canva.com/magic-studio/)`;
  return storage.save(MODULE_ID, { input, content: finalContent });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Brief visuel Canva', generate, list, get };
