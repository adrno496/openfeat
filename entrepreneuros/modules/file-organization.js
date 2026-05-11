// modules/file-organization.js — Plan d'organisation de fichiers (locaux ou Drive — l'arborescence est générique)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'file-organization';

const SYSTEM_PROMPT = `Tu es un consultant en productivité et systèmes pour entrepreneurs solos. Tu produis des arborescences de classement de fichiers qui :
- Suivent une logique simple (max 2-3 niveaux de profondeur)
- Privilégient l'usage (où je vais chercher) à la théorie (où c'est censé être)
- Évitent la prolifération de dossiers à 1 fichier
- Anticipent l'évolution sur 1 an
- Intègrent une convention de nommage cohérente

Pas de bullshit type "matrice à 5 dimensions" — on est seul.e, on veut retrouver vite.

Format de sortie :
1. **Diagnostic du chaos actuel** (5 lignes)
2. **Arborescence cible** sous forme d'arbre indenté (avec usage de chaque dossier en commentaire)
3. **Convention de nommage** : règles précises pour les fichiers (date, projet, version)
4. **Plan de migration** : étapes concrètes pour passer du chaos actuel à la cible (sans perdre 3 jours)
5. **Routine de maintenance** : 15 min/semaine ou /mois pour rester rangé
6. **Outils recommandés** : raccourcis OS, automatisations Hazel/Folder Actions/Drive, etc.`;

function buildUserPrompt(input) {
  const platform = input.platform || 'local';
  return `Construis un plan d'organisation pour les fichiers ${platform === 'drive' ? 'Google Drive' : platform === 'icloud' ? 'iCloud' : platform === 'dropbox' ? 'Dropbox' : 'locaux'} de cet entrepreneur.

**Plateforme** : ${platform}
**Volumétrie estimée** : ${input.volume || 'non précisée'}
**Types de fichiers principaux** : ${input.fileTypes || 'documents, factures, contrats, médias'}
**État actuel décrit par l'utilisateur** :
${input.currentState || '(non décrit — pars du principe que c\'est un fouillis classique)'}

**Domaines d'activité / projets en cours** :
${input.projects || '(non précisés)'}

**Collaborations / partages** :
${input.sharing || 'aucune (solo)'}

**Contraintes spécifiques** (RGPD, archivage légal, sauvegarde) :
${input.constraints || 'standards entrepreneur français : factures 10 ans, contrats illimité'}

Contexte entreprise :
${ctx.getSystemContext()}

Livre le plan complet selon la structure demandée. Pour l'arborescence, utilise un bloc \`\`\`text avec indentation claire.`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', ...options });
  return storage.save(MODULE_ID, { input, content });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Organisation fichiers', generate, list, get };
