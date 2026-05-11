// lib/context.js — Profil entreprise persistant (étendu)
const fs = require('fs');
const path = require('path');

const { dataFile } = require('./paths');
const PROFILE_FILE = dataFile('company-profile.json');

const FIELDS = [
  'name', 'founder', 'industry', 'country', 'description', 'audience', 'website', 'tone',
  // Étendus :
  'legalForm', 'siret', 'vatNumber', 'address', 'phone', 'emailContact',
  'iban', 'bic', 'bankName',
  'emailSignature', 'values', 'logoPath',
  // Workspace :
  'workspacePath',
  // Adaptation business / international :
  'businessModel', 'currency', 'language'
];

const BUSINESS_MODEL_LABELS = {
  saas:        'SaaS / produit logiciel récurrent',
  service_b2b: 'Service B2B (conseil, prestation entreprise)',
  service_b2c: 'Service B2C (à des particuliers)',
  ecommerce:   'E-commerce / vente en ligne',
  commerce:    'Commerce physique / boutique',
  restauration:'Restauration / food',
  artisanat:   'Artisanat / fabrication',
  coaching:    'Coaching / formation',
  contenu:     'Création de contenu / médias',
  agence:      'Agence (créa, dev, marketing…)',
  marketplace: 'Marketplace / mise en relation',
  liberale:    'Profession libérale (santé, droit, expertise…)',
  freelance:   'Freelance / indépendant pur'
};

const LANGUAGE_LABELS = {
  fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano', pt: 'Português', nl: 'Nederlands'
};

function ensureDir() {
  const dir = path.dirname(PROFILE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveProfile(data) {
  ensureDir();
  const clean = {};
  for (const f of FIELDS) clean[f] = (data && data[f]) || '';
  if (!clean.tone) clean.tone = 'professionnel et chaleureux';
  if (!clean.currency) clean.currency = 'EUR';
  if (!clean.language) clean.language = 'fr';
  clean.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

function getProfile() {
  try {
    if (!fs.existsSync(PROFILE_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
  } catch (e) {
    console.error('[context] lecture impossible :', e.message);
    return {};
  }
}

function getSystemContext() {
  const p = getProfile();
  if (!p || !p.name) {
    return 'Aucun profil entreprise renseigné. Réponds de manière générique et professionnelle.';
  }
  const lang = LANGUAGE_LABELS[p.language] || 'Français';
  const model = BUSINESS_MODEL_LABELS[p.businessModel] || (p.businessModel || 'non précisé');
  const lines = [
    `IMPORTANT : produis ta réponse en **${lang}**.`,
    `Tu travailles pour : ${p.name}${p.legalForm ? ' (' + p.legalForm + ')' : ''} — ${p.industry || 'secteur non précisé'}`,
    `Modèle d'entreprise : ${model} — adapte vocabulaire, benchmarks et conseils en conséquence (un restaurant ≠ un SaaS ≠ un coach).`,
    `Devise utilisée : ${p.currency || 'EUR'}`,
    `Fondateur / dirigeant : ${p.founder || 'non précisé'}`,
    `Description : ${p.description || 'non précisée'}`,
    `Audience cible : ${p.audience || 'non précisée'}`,
    `Pays : ${p.country || 'non précisé'} | Site : ${p.website || 'non précisé'}`,
    `Ton éditorial : ${p.tone || 'professionnel et chaleureux'}`
  ];
  if (p.values) lines.push(`Valeurs / positionnement : ${p.values}`);
  const legal = [];
  if (p.siret) legal.push(`SIRET ${p.siret}`);
  if (p.vatNumber) legal.push(`TVA ${p.vatNumber}`);
  if (p.address) legal.push(p.address);
  if (legal.length) lines.push(`Mentions légales : ${legal.join(' · ')}`);
  if (p.emailContact || p.phone) {
    lines.push(`Contact : ${[p.emailContact, p.phone].filter(Boolean).join(' · ')}`);
  }
  if (p.iban) lines.push(`Coordonnées bancaires : IBAN ${p.iban}${p.bic ? ' · BIC ' + p.bic : ''}${p.bankName ? ' · ' + p.bankName : ''}`);
  if (p.emailSignature) lines.push(`Signature email à utiliser :\n${p.emailSignature}`);
  if (p.workspacePath) {
    try {
      const ws = require('./workspace');
      const snippet = ws.getContextSnippet(p.workspacePath);
      if (snippet) lines.push(`\nContexte du dossier de travail :\n${snippet}`);
    } catch (e) { /* ignore */ }
  }
  return lines.join('\n');
}

module.exports = { saveProfile, getProfile, getSystemContext, FIELDS, BUSINESS_MODEL_LABELS, LANGUAGE_LABELS };
