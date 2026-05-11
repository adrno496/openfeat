// modules/pdf-compare.js — Compare 2 PDF (ex: contrat v1 vs contrat v2)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');
const { extractText } = require('../lib/pdf-extract');

const MODULE_ID = 'pdf-compare';

const SYSTEM_PROMPT = `Tu es un juriste / analyste expert en relecture de documents. Tu compares deux versions d'un même document (ou deux documents proches) et tu produis une analyse structurée :

1. **Synthèse de la comparaison** (3-5 lignes : ce qui change globalement)
2. **Différences clauses par clauses** (sous forme de tableau)
   | Section | Version A | Version B | Impact |
3. **Ajouts dans B** (clauses, paragraphes, mentions nouvelles)
4. **Suppressions par rapport à A** (ce qui a disparu)
5. **Modifications de fond** (changements de chiffres, dates, montants, durées, obligations) — chacune avec verbatim « ancienne formulation » → « nouvelle formulation »
6. **Modifications cosmétiques** (reformulations sans impact juridique) — résumé bref
7. **Évaluation de l'impact pour l'utilisateur** (favorable / neutre / défavorable, avec justification)
8. **Points à renégocier ou à signaler** avant signature/validation

Sois précis, cite les passages clés entre guillemets. Markdown structuré avec tableaux.`;

const MAX_CHARS_EACH = 50000;

async function generate(input, options = {}) {
  if (!input.filePathA || !input.filePathB) {
    throw new Error('Deux fichiers PDF sont requis (A et B)');
  }

  const [a, b] = await Promise.all([
    extractText(input.filePathA),
    extractText(input.filePathB)
  ]);
  if (!a.text || !b.text) {
    throw new Error('Un des deux PDF est illisible (peut-être scanné sans OCR)');
  }

  const truncate = (t) => t.length > MAX_CHARS_EACH
    ? t.slice(0, MAX_CHARS_EACH) + `\n\n[...tronqué — ${t.length - MAX_CHARS_EACH} caractères omis]`
    : t;

  const userPrompt = `Compare ces deux documents et produis l'analyse structurée demandée.

Contexte entreprise :
${ctx.getSystemContext()}

${input.focus ? `Focus particulier demandé par l'utilisateur :\n${input.focus}\n\n` : ''}---

## VERSION A : ${a.fileName} (${a.numPages} pages)

${truncate(a.text)}

---

## VERSION B : ${b.fileName} (${b.numPages} pages)

${truncate(b.text)}`;

  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, {
    tier: options.tier || 'sonnet',
    maxTokens: 4096,
    ...options
  });

  return storage.save(MODULE_ID, {
    input: {
      fileA: a.fileName,
      fileB: b.fileName,
      pagesA: a.numPages,
      pagesB: b.numPages,
      focus: input.focus || ''
    },
    content
  });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Comparer 2 PDF', generate, list, get };
