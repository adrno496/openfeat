// modules/invoice.js — Facture multi-lignes, multi-devise, multi-pays
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');
const pdfLib = require('../lib/pdf');

const MODULE_ID = 'invoice';

const CURRENCY_SYMBOLS = { EUR:'€', USD:'$', GBP:'£', CHF:'CHF', CAD:'CA$', MAD:'MAD', XOF:'FCFA', XAF:'FCFA' };

const SYSTEM_PROMPT = `Tu es un expert-comptable international. Tu adaptes les mentions légales et les conventions de facturation au pays et au type d'entité indiqué.

Pays principaux à connaître :
- France : pénalités de retard 3× taux légal, indemnité forfaitaire 40 €, mention "TVA non applicable, art. 293 B du CGI" pour auto-entrepreneurs, mention SIRET, RCS
- Belgique : mention "Régime particulier — Petite entreprise" si exonéré, BCE
- Suisse : pas de TVA en dessous de CHF 100k, mention IDE
- Canada : TPS/TVQ (Québec), TPS/TVH (autres)
- Maroc : ICE obligatoire, taux TVA 7/10/14/20%
- UE intracom B2B : exonération TVA art. 138 + n° TVA des deux parties

Tu produis :
1. Un email d'envoi court (3-6 lignes) dans la langue du profil, courtois, rappelant échéance et modalités de paiement
2. Un récapitulatif markdown structuré de la facture avec tableau des lignes
3. Une checklist des mentions légales obligatoires pour le pays + auto-vérification (✅ présent / ⚠️ manquant)`;

function formatAmount(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || '€';
  return `${Number(n || 0).toFixed(2)} ${sym}`;
}

function parseLines(rawLines) {
  // rawLines : tableau d'objets {description, qty, unitPrice, vatRate} OU string CSV
  if (Array.isArray(rawLines)) return rawLines;
  if (typeof rawLines !== 'string') return [];
  // Format simple : une ligne = "description | qty | unitPrice | vatRate"
  return rawLines.split('\n').filter((l) => l.trim()).map((line) => {
    const parts = line.split('|').map((s) => s.trim());
    return {
      description: parts[0] || '',
      qty: parseFloat(parts[1]) || 1,
      unitPrice: parseFloat(parts[2]) || 0,
      vatRate: parseFloat(parts[3]) || 0
    };
  });
}

function computeTotals(lines) {
  const totals = { ht: 0, vatByRate: {}, totalVat: 0, ttc: 0 };
  for (const l of lines) {
    const subtotal = (l.qty || 0) * (l.unitPrice || 0);
    totals.ht += subtotal;
    const vat = subtotal * ((l.vatRate || 0) / 100);
    totals.totalVat += vat;
    if (!totals.vatByRate[l.vatRate]) totals.vatByRate[l.vatRate] = 0;
    totals.vatByRate[l.vatRate] += vat;
  }
  totals.ttc = totals.ht + totals.totalVat;
  return totals;
}

function buildUserPrompt(input) {
  const profile = ctx.getProfile() || {};
  const currency = input.currency || profile.currency || 'EUR';
  const country = input.country || profile.country || 'France';
  const lines = parseLines(input.lines || []);
  const totals = computeTotals(lines);

  const linesTable = lines.length
    ? lines.map((l) => `| ${l.description} | ${l.qty} | ${formatAmount(l.unitPrice, currency)} | ${l.vatRate}% | ${formatAmount(l.qty * l.unitPrice, currency)} |`).join('\n')
    : `| ${input.description || 'Prestation'} | 1 | ${formatAmount(input.amount || 0, currency)} | 0% | ${formatAmount(input.amount || 0, currency)} |`;

  const vatBreakdown = Object.entries(totals.vatByRate)
    .map(([rate, amount]) => `TVA ${rate}% : ${formatAmount(amount, currency)}`).join(' | ');

  return `Génère l'email d'envoi + le récapitulatif markdown + la checklist mentions légales pour la facture suivante :

**Émetteur** : ${profile.name || 'Mon entreprise'} (${country})
**Client** : ${input.clientName}
**Email client** : ${input.clientEmail || 'non précisé'}
**Type client** : ${input.clientType || 'B2B'}
**N° TVA client (si UE intracom)** : ${input.clientVatNumber || 'non applicable'}

**N° de facture** : ${input.invoiceNumber}
**Date d'émission** : ${input.issueDate || 'aujourd\'hui'}
**Date d'échéance** : ${input.dueDate || '30 jours après émission'}
**Devise** : ${currency}

**Lignes de facturation** :
| Description | Qté | PU HT | TVA | Total HT |
|---|---|---|---|---|
${linesTable}

**Totaux** :
- Total HT : ${formatAmount(totals.ht, currency)}
- ${vatBreakdown || 'Pas de TVA'}
- **Total TTC : ${formatAmount(totals.ttc, currency)}**

**Conditions de paiement** : ${input.paymentTerms || 'Virement sous 30 jours'}
**Acompte versé** : ${input.deposit ? formatAmount(input.deposit, currency) : 'aucun'}
**Note pour le client (optionnel)** : ${input.note || 'aucune'}

Contexte entreprise :
${ctx.getSystemContext()}

Format de sortie attendu :
## Email à envoyer
[corps de l'email — sujet inclus]

## Récapitulatif facture
[résumé markdown avec tableau lignes + totaux]

## Mentions légales — checklist (${country})
[liste à cocher des mentions obligatoires pour ce pays + statut ✅/⚠️ basé sur les infos fournies]`;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'haiku', ...options });
  let pdfPath = null;
  try { pdfPath = await pdfLib.generateInvoicePDF(input); }
  catch (e) { /* PDF facultatif */ }
  return storage.save(MODULE_ID, { input, content, pdfPath });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Facture PDF', generate, list, get, parseLines, computeTotals };
