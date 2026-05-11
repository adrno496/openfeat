// modules/pdf-analyzer.js — Analyse de documents PDF (contrat, facture, devis, etc.)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');
const { extractText } = require('../lib/pdf-extract');

const MODULE_ID = 'pdf-analyzer';

const PROMPTS = {
  contrat: `Tu es un juriste d'affaires francophone. Analyse le contrat fourni et produis :
1. **Résumé exécutif** (5 lignes max)
2. **Parties** (identité, rôle)
3. **Objet du contrat**
4. **Durée et reconduction**
5. **Engagements clés** (de chaque partie)
6. **Conditions financières** (prix, modalités, pénalités)
7. **Clauses sensibles ou inhabituelles** (responsabilité, exclusivité, non-concurrence, propriété intellectuelle, données personnelles)
8. **Modalités de résiliation**
9. **Loi applicable et juridiction**
10. **Risques identifiés et points à négocier** (le plus utile)
11. **Recommandations concrètes** avant signature

Sois précis, cite les clauses litigieuses entre guillemets. Markdown structuré.`,

  facture: `Tu es un comptable expérimenté. Analyse cette facture et extrais :
- **Émetteur** (nom, SIRET, adresse, TVA intracommunautaire)
- **Destinataire**
- **Numéro de facture, date d'émission, date d'échéance**
- **Lignes de facturation** (description, quantité, PU HT, total HT) sous forme de tableau
- **Totaux** (HT, TVA détaillée par taux, TTC)
- **Conditions de paiement** (mode, délai, pénalités de retard, escompte)
- **Mentions légales obligatoires** présentes/manquantes (RCS, capital, TVA, etc.)
- **Anomalies ou alertes** (calcul de TVA, doublons, mentions manquantes, formulations à risque)

Markdown clair avec tableaux.`,

  devis: `Tu es un acheteur senior. Analyse ce devis et produis :
- **Émetteur et coordonnées**
- **Validité du devis et date**
- **Détail des prestations** (tableau description / quantité / PU / total)
- **Conditions tarifaires** (HT, TVA, TTC, remises)
- **Délais de réalisation et conditions de paiement**
- **CGV applicables** (référence, points sensibles)
- **Comparaison avec les standards de marché** (estimation prix juste / cher / négociable)
- **Points de vigilance** (mentions manquantes, formulations ambiguës)
- **Recommandation** : signer en l'état / négocier / refuser

Markdown structuré.`,

  rapport: `Tu es un analyste senior. Produis une analyse complète du document :
- **Résumé exécutif** (10 lignes)
- **Sujet et objectif du document**
- **Structure et plan**
- **Faits clés et chiffres marquants**
- **Conclusions et recommandations de l'auteur**
- **Forces de l'argumentation**
- **Limites, biais ou angles morts**
- **Actions concrètes à en tirer**

Markdown clair.`,

  auto: `Tu es un analyste polyvalent. Identifie d'abord la nature du document (contrat, facture, devis, rapport, courrier, CV, etc.) puis produis une analyse adaptée :
- **Type de document détecté**
- **Résumé exécutif** (5-10 lignes)
- **Acteurs / parties impliquées**
- **Informations clés** (dates, montants, délais, obligations)
- **Points sensibles ou inhabituels**
- **Risques, anomalies, mentions manquantes**
- **Actions recommandées**

Markdown structuré, tableaux si pertinent.`
};

const MAX_CHARS = 80000; // ~25-30 pages denses ; le reste tronqué pour limiter le coût

async function generate(input, options = {}) {
  if (!input.filePath) throw new Error('Aucun fichier PDF sélectionné');

  const extracted = await extractText(input.filePath);
  if (!extracted.text || extracted.text.length < 20) {
    throw new Error('PDF illisible ou vide (peut-être un PDF scanné sans OCR — non supporté)');
  }

  const docType = input.docType || 'auto';
  const systemPrompt = PROMPTS[docType] || PROMPTS.auto;
  const truncated = extracted.text.length > MAX_CHARS
    ? extracted.text.slice(0, MAX_CHARS) + `\n\n[...document tronqué — ${extracted.text.length - MAX_CHARS} caractères omis]`
    : extracted.text;

  const userPrompt = `Document à analyser : **${extracted.fileName}** (${extracted.numPages} pages)

Contexte entreprise utilisateur :
${ctx.getSystemContext()}

${input.questions ? `Questions spécifiques posées par l'utilisateur :\n${input.questions}\n\n---\n\n` : ''}Contenu du PDF :

${truncated}`;

  const content = await llm.generate(systemPrompt, userPrompt, {
    tier: options.tier || 'sonnet',
    maxTokens: 4096,
    ...options
  });

  return storage.save(MODULE_ID, {
    input: {
      fileName: extracted.fileName,
      filePath: extracted.filePath,
      docType,
      numPages: extracted.numPages,
      questions: input.questions || ''
    },
    content
  });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Analyse PDF', generate, list, get };
