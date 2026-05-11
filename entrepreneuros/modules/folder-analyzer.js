// modules/folder-analyzer.js — Analyse stratégique d'un dossier de projet complet
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');
const { readKeyFiles } = require('../lib/workspace-read');

const MODULE_ID = 'folder-analyzer';

const PROMPTS = {
  overview: `Tu es un consultant senior chargé d'auditer un projet entrepreneur à partir des documents fournis. Tu produis une **vue d'ensemble lucide et opérationnelle** :

1. **Synthèse exécutive** (10 lignes max) : qu'est-ce que c'est ? Où en est le projet ? Maturité ?
2. **Cartographie du projet** : domaines couverts (commercial, juridique, finance, marketing, opérationnel) et état pour chacun
3. **Forces visibles** dans les documents (ce qui est solide)
4. **Faiblesses / manques apparents** (ce qui devrait être fait mais n'apparaît pas)
5. **Documents clés identifiés** avec leur rôle (et qui pourraient être à actualiser)
6. **Cohérence d'ensemble** : les pièces s'emboîtent-elles ? Y a-t-il des contradictions ?
7. **Top 5 priorités** à traiter dans les prochaines semaines
8. **Risques détectés** (juridiques, financiers, opérationnels)

Sois précis et CITE les noms de fichiers réels que tu as analysés. Pas de généralités.`,

  gaps: `Tu es un coach pragmatique. À partir des documents disponibles, tu détectes ce qui MANQUE pour qu'un projet entrepreneur solo soit complet et solide :

Sortie attendue :
1. **Inventaire de ce qui est déjà fait** (rapide, par domaine)
2. **Manques critiques** : documents/outputs qu'un projet de ce type devrait avoir et qui ne sont pas là (avec justification — pourquoi c'est important)
3. **Manques de qualité** : ce qui existe mais semble insuffisant (basé sur le contenu lu)
4. **Plan de complétion 30 jours** : 5-10 actions concrètes par ordre de priorité, chacune avec impact attendu
5. **Modules de l'app à utiliser pour combler ces manques** (Business Plan, Forecast, Legal, Cold Email, etc.)

Sois exigeant : "il y a un brief client" n'est pas suffisant si le brief est à moitié rempli. Dis-le.`,

  strategy: `Tu es un stratège qui prend du recul. À partir des documents fournis, tu produis une **vision stratégique** :

1. **Diagnostic en 5 lignes** : ce que tu vois du projet
2. **Positionnement actuel** : où l'entrepreneur se positionne (volontairement ou par défaut)
3. **Modèle économique implicite** : comment l'argent rentre
4. **Hypothèses non vérifiées** que les documents font (les lister explicitement)
5. **3 scénarios stratégiques** sur 6-12 mois :
   - Scénario A — consolidation (continuer ce qui est commencé)
   - Scénario B — pivot ou expansion
   - Scénario C — focus radical
   Pour chaque scénario : implications concrètes, ressources requises, risques
6. **Recommandation argumentée** : lequel choisir et pourquoi
7. **Premières actions** dans les 7 prochains jours

Reste honnête. Si les documents ne permettent pas de trancher, dis-le.`,

  roadmap: `Tu es un chef de projet qui doit produire une roadmap concrète à partir des documents existants :

1. **État des lieux** par domaine (commercial / produit / opérations / juridique / finance)
2. **Roadmap 90 jours** sous forme de tableau :
   | Semaine | Domaine | Action | Livrable | Outil/module à utiliser |
3. **Dépendances critiques** : ce qui doit être fait avant quoi
4. **Quick wins** réalisables en moins de 4h
5. **Investissements en temps et argent** à prévoir
6. **Risques de la roadmap** et plan B`,

  inventory: `Tu es un archiviste / auditeur. Tu produis un inventaire structuré de TOUT ce qui se trouve dans le dossier :

1. **Tableau récapitulatif** par grande catégorie (Documents commerciaux / Juridique / Finance / Marketing / Opérationnel / Autres)
2. **Pour chaque fichier important lu** : nom, rôle/contenu en 1 ligne, statut (à jour / à actualiser / obsolète selon ce que tu peux déduire), recommandation
3. **Doublons ou versions concurrentes** détectés
4. **Documents manifestement obsolètes** (à archiver)
5. **Suggestions d'organisation** pour mieux retrouver`
};

async function generate(input, options = {}) {
  const folderPath = input.folderPath || (ctx.getProfile() || {}).workspacePath;
  if (!folderPath) throw new Error('Aucun dossier sélectionné. Choisis un dossier ou définis un dossier de travail dans le profil.');

  const analysisType = input.analysisType || 'overview';
  const systemPrompt = PROMPTS[analysisType] || PROMPTS.overview;

  // Lecture profonde
  const { files, summary } = await readKeyFiles(folderPath, {
    maxFiles: 12,
    charsPerFile: 3500,
    totalBudget: 30000
  });

  if (!summary || summary.totalFiles === 0) {
    throw new Error('Le dossier est vide ou inaccessible');
  }

  const tagLabels = { contrat:'Contrats', facture:'Factures', juridique:'Juridique', finance:'Finance', marketing:'Marketing', client:'Client', livrable:'Livrables' };
  const typeLabels = { document:'Documents', spreadsheet:'Tableurs', presentation:'Présentations', text:'Notes', image:'Images', video:'Vidéos', audio:'Audio', archive:'Archives', code:'Code', design:'Design', autre:'Autres' };

  const inventoryBlock = [
    `**Dossier analysé** : ${summary.rootName} (${summary.rootPath})`,
    `**Volume** : ${summary.totalFiles} fichiers`,
    `**Sous-dossiers principaux** : ${summary.topDirs.map((d) => `${d.name} (${d.count})`).join(', ') || 'aucun'}`,
    `**Répartition par type** : ${Object.entries(summary.byType).map(([t, n]) => `${typeLabels[t] || t}: ${n}`).join(' | ')}`,
    `**Catégories métier détectées** : ${Object.entries(summary.byTag).map(([t, n]) => `${tagLabels[t] || t}: ${n}`).join(' | ') || 'aucune détectée par mots-clés'}`,
    `**Fichiers récents** : ${summary.recent.slice(0, 8).map((f) => f.name).join(', ')}`
  ].join('\n');

  const filesBlock = files.length
    ? files.map((f, i) => `### Fichier ${i + 1} : ${f.name} (${f.relPath})\n\n${f.excerpt}${f.truncated ? '\n\n[…tronqué]' : ''}`).join('\n\n---\n\n')
    : '_Aucun fichier texte/PDF lisible n\'a été trouvé. L\'analyse se basera uniquement sur la structure du dossier et les noms de fichiers._';

  const userPrompt = `Voici un dossier de projet à analyser pour un entrepreneur.

${input.objective ? `**Objectif spécifique demandé par l'utilisateur** :\n${input.objective}\n\n` : ''}## Synthèse du dossier

${inventoryBlock}

## Contenu des fichiers clés (extraits)

${filesBlock}

## Contexte entreprise

${ctx.getSystemContext()}

Produis l'analyse demandée selon la structure du système. Réfère-toi aux fichiers réels par leur nom quand pertinent.`;

  const content = await llm.generate(systemPrompt, userPrompt, {
    tier: options.tier || 'sonnet',
    maxTokens: 4096,
    ...options
  });

  return storage.save(MODULE_ID, {
    input: {
      folderPath,
      folderName: summary.rootName,
      analysisType,
      objective: input.objective || '',
      filesAnalyzed: files.length,
      totalFiles: summary.totalFiles
    },
    content
  });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Analyse de dossier', generate, list, get };
