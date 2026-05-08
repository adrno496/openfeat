'use strict';

/* =========================================================================
   i18n
   ========================================================================= */
const i18n = {
  fr: {
    appName: 'LexiGen',
    steps: ['Entreprise', 'Activité', 'Légal', 'Générer'],
    stepTitles: [
      'Informations sur votre entreprise',
      'Votre activité commerciale',
      'Options légales',
      'Générer votre document'
    ],
    stepSubtitles: [
      'Renseignez les informations légales de votre société',
      'Décrivez vos produits et marchés cibles',
      'Configurez vos politiques légales',
      'Choisissez le format et générez vos CGV'
    ],
    generate: 'Générer les CGV',
    generating: 'Génération en cours…',
    generationDone: 'Document généré avec succès',
    exportDocx: 'Exporter en DOCX',
    exportPdf: 'Exporter en PDF',
    regenerate: 'Régénérer',
    copy: 'Copier',
    copied: 'Copié !',
    back: '← Retour',
    backToForm: 'Retour au formulaire',
    next: 'Continuer →',
    savedAs: 'Fichier sauvegardé',
    errorClaudeNotFound: "Configuration manquante. Recharge la page pour saisir ta clé API Anthropic.",
    errorAuth: 'Clé API Anthropic invalide ou expirée. Recharge la page et saisis une nouvelle clé.',
    errorGeneric: 'Erreur lors de la génération. Veuillez réessayer.',
    errorTitle: 'Une erreur est survenue',
    required: 'Ce champ est requis',
    requiredEmail: 'Email valide requis',
    preview: 'Aperçu du document',
    words: 'mots',
    chooseAtLeastOne: 'Sélectionnez au moins une option',

    // Field labels
    companyName: "Nom de l'entreprise",
    companyNamePh: 'ex : Atelier Dupont SARL',
    legalForm: 'Forme juridique',
    siret: 'Numéro SIRET / RCS (optionnel)',
    siretPh: '123 456 789 00012',
    country: "Pays d'établissement",
    address: 'Adresse complète',
    addressPh: '12 rue de la République, 75001 Paris, France',
    contactEmail: 'Email de contact',
    contactEmailPh: 'contact@monsite.fr',
    website: 'URL du site web',
    websitePh: 'https://monsite.fr',
    businessType: "Type d'activité",
    productDescription: 'Description de vos produits / services',
    productDescriptionPh: 'Décrivez en 2-3 phrases ce que vous vendez et à qui...',
    priceRange: 'Gamme de prix',
    targetCountries: 'Marchés ciblés',
    returnPolicy: 'Politique de retour',
    returnDetails: 'Détails de la politique personnalisée',
    returnDetailsPh: 'Précisez votre politique de retour personnalisée...',
    warrantyType: 'Garantie proposée',
    paymentMethods: 'Moyens de paiement acceptés',
    deliveryDelay: 'Délai de livraison',
    dataController: 'Responsable du traitement RGPD (optionnel)',
    dataControllerPh: "Nom du DPO ou responsable",
    outputLanguage: 'Langue du document',
    documentStyle: 'Style du document',
    jurisdiction: 'Juridiction applicable',

    // Section titles
    sectionIdentity: 'Identité légale',
    sectionContact: 'Coordonnées',
    sectionActivity: 'Activité',
    sectionMarkets: 'Marchés & prix',
    sectionReturns: 'Retours & garantie',
    sectionPayment: 'Paiement & livraison',
    sectionGdpr: 'RGPD',
    sectionOutput: 'Format de sortie',

    // Options
    legalForms: ['Auto-entrepreneur', 'SASU', 'EURL', 'SAS', 'SARL', 'SA', 'LLC', 'Sole proprietor', 'Autre'],
    countries: ['France', 'Belgique', 'Suisse', 'Canada', 'Royaume-Uni', 'États-Unis', 'Autre'],
    businessTypes: [
      'E-commerce (produits physiques)',
      'E-commerce (produits digitaux)',
      'Services B2C',
      'Services B2B',
      'SaaS / Logiciel',
      'Marketplace',
      'Formation en ligne',
      'Mixte'
    ],
    priceRanges: ['< 50 €', '50 € – 200 €', '200 € – 1000 €', '> 1000 €', 'Variable'],
    targetCountriesOptions: ['France', 'Union Européenne', 'Royaume-Uni', 'États-Unis', 'International'],
    returnPolicies: [
      '14 jours légal FR (défaut)',
      '30 jours',
      'Aucun retour (digitaux)',
      'Politique personnalisée'
    ],
    warrantyTypes: ['Légale 2 ans (FR)', '1 an', 'Aucune garantie', 'Garantie étendue'],
    paymentMethodOptions: ['Carte bancaire', 'PayPal', 'Virement bancaire', 'Crypto', 'Autre'],
    deliveryDelays: ['Immédiat (digital)', '24-48h', '3-5 jours ouvrés', '7-14 jours', 'Sur devis'],
    outputLanguageOptions: ['Français', 'English', 'Bilingue FR + EN'],
    outputLanguageValues: ['FR', 'EN', 'BOTH'],
    documentStyles: ['Standard légal', 'Simplifié (langage clair)', 'Bilingue côte à côte'],
    jurisdictions: ['France (loi française)', 'Belgique', 'Suisse', 'Royaume-Uni', 'États-Unis – Delaware', 'International']
  },
  en: {
    appName: 'LexiGen',
    steps: ['Business', 'Activity', 'Legal', 'Generate'],
    stepTitles: [
      'Business information',
      'Your commercial activity',
      'Legal options',
      'Generate your document'
    ],
    stepSubtitles: [
      "Fill in your company's legal details",
      'Describe your products and target markets',
      'Configure your legal policies',
      'Choose the format and generate your Terms'
    ],
    generate: 'Generate Terms',
    generating: 'Generating…',
    generationDone: 'Document generated successfully',
    exportDocx: 'Export DOCX',
    exportPdf: 'Export PDF',
    regenerate: 'Regenerate',
    copy: 'Copy',
    copied: 'Copied!',
    back: '← Back',
    backToForm: 'Back to form',
    next: 'Continue →',
    savedAs: 'File saved',
    errorClaudeNotFound: "Missing configuration. Reload the page to enter your Anthropic API key.",
    errorAuth: 'Invalid or expired Anthropic API key. Reload the page and enter a new key.',
    errorGeneric: 'Generation failed. Please try again.',
    errorTitle: 'An error occurred',
    required: 'This field is required',
    requiredEmail: 'Valid email required',
    preview: 'Document preview',
    words: 'words',
    chooseAtLeastOne: 'Select at least one option',

    companyName: 'Company name',
    companyNamePh: 'e.g. Acme Corp Ltd',
    legalForm: 'Legal structure',
    siret: 'Company number / EIN (optional)',
    siretPh: '12-3456789',
    country: 'Country of registration',
    address: 'Full address',
    addressPh: '123 Main Street, London, UK',
    contactEmail: 'Contact email',
    contactEmailPh: 'contact@mysite.com',
    website: 'Website URL',
    websitePh: 'https://mysite.com',
    businessType: 'Business type',
    productDescription: 'Description of your products / services',
    productDescriptionPh: 'In 2-3 sentences, describe what you sell and to whom...',
    priceRange: 'Price range',
    targetCountries: 'Target markets',
    returnPolicy: 'Return policy',
    returnDetails: 'Custom return policy details',
    returnDetailsPh: 'Describe your custom return policy...',
    warrantyType: 'Warranty offered',
    paymentMethods: 'Accepted payment methods',
    deliveryDelay: 'Delivery timeline',
    dataController: 'GDPR data controller (optional)',
    dataControllerPh: 'DPO or data officer name',
    outputLanguage: 'Document language',
    documentStyle: 'Document style',
    jurisdiction: 'Applicable jurisdiction',

    sectionIdentity: 'Legal identity',
    sectionContact: 'Contact details',
    sectionActivity: 'Activity',
    sectionMarkets: 'Markets & pricing',
    sectionReturns: 'Returns & warranty',
    sectionPayment: 'Payment & delivery',
    sectionGdpr: 'GDPR',
    sectionOutput: 'Output format',

    legalForms: ['Sole proprietor', 'LLC', 'Corporation', 'SASU', 'EURL', 'SAS', 'SARL', 'Ltd', 'Other'],
    countries: ['France', 'Belgium', 'Switzerland', 'Canada', 'United Kingdom', 'United States', 'Other'],
    businessTypes: [
      'E-commerce (physical products)',
      'E-commerce (digital products)',
      'B2C Services',
      'B2B Services',
      'SaaS / Software',
      'Marketplace',
      'Online course',
      'Mixed'
    ],
    priceRanges: ['< $50', '$50 – $200', '$200 – $1000', '> $1000', 'Variable'],
    targetCountriesOptions: ['France', 'European Union', 'United Kingdom', 'United States', 'International'],
    returnPolicies: [
      '14 days (FR/EU default)',
      '30 days',
      'No returns (digital)',
      'Custom policy'
    ],
    warrantyTypes: ['Legal 2 years (FR/EU)', '1 year', 'No warranty', 'Extended warranty'],
    paymentMethodOptions: ['Credit card', 'PayPal', 'Bank transfer', 'Crypto', 'Other'],
    deliveryDelays: ['Immediate (digital)', '24-48h', '3-5 business days', '7-14 days', 'Custom quote'],
    outputLanguageOptions: ['French', 'English', 'Bilingual FR + EN'],
    outputLanguageValues: ['FR', 'EN', 'BOTH'],
    documentStyles: ['Legal standard', 'Simplified (plain language)', 'Bilingual side-by-side'],
    jurisdictions: ['France (French law)', 'Belgium', 'Switzerland', 'United Kingdom', 'United States – Delaware', 'International']
  }
};

/* =========================================================================
   STATE
   ========================================================================= */
const state = {
  currentStep: 0,
  currentLang: 'fr',
  formData: {
    outputLanguage: 'FR',
    targetCountries: [],
    paymentMethods: []
  },
  generatedContent: '',
  isGenerating: false,
  generationDone: false,
  unsubscribeChunk: null
};

const t = (key) => i18n[state.currentLang][key] ?? key;

/* =========================================================================
   FIELD DEFINITIONS
   ========================================================================= */
function getStepFields(stepIndex) {
  const L = i18n[state.currentLang];

  if (stepIndex === 0) {
    return [
      { type: 'section', titleKey: 'sectionIdentity' },
      { id: 'companyName', type: 'text', labelKey: 'companyName', placeholderKey: 'companyNamePh', required: true },
      { id: 'legalForm', type: 'select', labelKey: 'legalForm', options: L.legalForms, required: true },
      { id: 'country', type: 'select', labelKey: 'country', options: L.countries, required: true },
      { id: 'siret', type: 'text', labelKey: 'siret', placeholderKey: 'siretPh', required: false },
      { type: 'section', titleKey: 'sectionContact' },
      { id: 'address', type: 'textarea', labelKey: 'address', placeholderKey: 'addressPh', required: true, fullWidth: true },
      { id: 'contactEmail', type: 'email', labelKey: 'contactEmail', placeholderKey: 'contactEmailPh', required: true },
      { id: 'website', type: 'text', labelKey: 'website', placeholderKey: 'websitePh', required: true }
    ];
  }

  if (stepIndex === 1) {
    return [
      { type: 'section', titleKey: 'sectionActivity' },
      { id: 'businessType', type: 'select', labelKey: 'businessType', options: L.businessTypes, required: true, fullWidth: true },
      { id: 'productDescription', type: 'textarea', labelKey: 'productDescription', placeholderKey: 'productDescriptionPh', required: true, fullWidth: true },
      { type: 'section', titleKey: 'sectionMarkets' },
      { id: 'priceRange', type: 'select', labelKey: 'priceRange', options: L.priceRanges, required: true },
      { id: 'targetCountries', type: 'checkboxes', labelKey: 'targetCountries', options: L.targetCountriesOptions, required: true, fullWidth: true }
    ];
  }

  if (stepIndex === 2) {
    return [
      { type: 'section', titleKey: 'sectionReturns' },
      { id: 'returnPolicy', type: 'select', labelKey: 'returnPolicy', options: L.returnPolicies, required: true },
      { id: 'warrantyType', type: 'select', labelKey: 'warrantyType', options: L.warrantyTypes, required: true },
      {
        id: 'returnDetails', type: 'textarea', labelKey: 'returnDetails', placeholderKey: 'returnDetailsPh',
        required: true, fullWidth: true,
        conditionalOn: { id: 'returnPolicy', valueIndex: 3 } // "Custom"
      },
      { type: 'section', titleKey: 'sectionPayment' },
      { id: 'paymentMethods', type: 'checkboxes', labelKey: 'paymentMethods', options: L.paymentMethodOptions, required: true, fullWidth: true },
      { id: 'deliveryDelay', type: 'select', labelKey: 'deliveryDelay', options: L.deliveryDelays, required: true },
      { type: 'section', titleKey: 'sectionGdpr' },
      { id: 'dataController', type: 'text', labelKey: 'dataController', placeholderKey: 'dataControllerPh', required: false, fullWidth: true }
    ];
  }

  if (stepIndex === 3) {
    return [
      { type: 'section', titleKey: 'sectionOutput' },
      { id: 'outputLanguage', type: 'output-lang', labelKey: 'outputLanguage', required: true, fullWidth: true },
      { id: 'documentStyle', type: 'select', labelKey: 'documentStyle', options: L.documentStyles, required: true },
      { id: 'jurisdiction', type: 'select', labelKey: 'jurisdiction', options: L.jurisdictions, required: true }
    ];
  }

  return [];
}

/* =========================================================================
   RENDERING
   ========================================================================= */
function renderSidebarSteps() {
  const nav = document.getElementById('stepsNav');
  const steps = i18n[state.currentLang].steps;
  nav.innerHTML = '';
  steps.forEach((label, i) => {
    const item = document.createElement('div');
    item.className = 'step-item';
    if (i === state.currentStep) item.classList.add('active');
    if (i < state.currentStep) item.classList.add('completed', 'clickable');
    item.innerHTML = `
      <div class="step-num">${i < state.currentStep ? '✓' : i + 1}</div>
      <div class="step-label">${escapeHtml(label)}</div>
    `;
    if (i < state.currentStep) {
      item.addEventListener('click', () => goToStep(i));
    }
    nav.appendChild(item);
  });
}

function renderHeader() {
  document.getElementById('stepTitle').textContent = i18n[state.currentLang].stepTitles[state.currentStep] || '';
  document.getElementById('stepSubtitle').textContent = i18n[state.currentLang].stepSubtitles[state.currentStep] || '';
  updateProgress();
}

function updateProgress() {
  const total = 4;
  const pct = Math.round(((state.currentStep + (state.generationDone ? 1 : 0)) / total) * 100);
  const clamped = Math.min(100, pct);
  document.getElementById('progressPct').textContent = clamped + '%';
  const circumference = 113;
  const offset = circumference - (circumference * clamped) / 100;
  document.getElementById('ringFill').style.strokeDashoffset = offset;
}

function renderStep(stepIndex) {
  const container = document.getElementById('formContainer');
  container.classList.remove('fade-in');
  void container.offsetWidth; // reflow
  container.classList.add('fade-in');

  const fields = getStepFields(stepIndex);
  const grid = document.createElement('div');
  grid.className = 'form-grid';

  for (const f of fields) {
    if (f.type === 'section') {
      const sec = document.createElement('div');
      sec.className = 'section-title';
      sec.textContent = t(f.titleKey);
      grid.appendChild(sec);
      continue;
    }

    if (f.conditionalOn) {
      const currentVal = state.formData[f.conditionalOn.id];
      const opts = i18n[state.currentLang][findOptionsKey(f.conditionalOn.id, stepIndex)] || [];
      const expected = opts[f.conditionalOn.valueIndex];
      if (currentVal !== expected) continue;
    }

    grid.appendChild(buildFieldElement(f));
  }

  container.innerHTML = '';
  container.appendChild(grid);

  // Wire conditional re-render
  const condTriggers = fields.filter(f => fields.some(g => g.conditionalOn?.id === f.id));
  condTriggers.forEach(tr => {
    const el = container.querySelector(`[data-field="${tr.id}"]`);
    if (el) {
      el.addEventListener('change', () => {
        collectStepData(stepIndex, true);
        renderStep(stepIndex);
      });
    }
  });

  // Show/hide nav buttons appropriately
  document.getElementById('prevBtn').classList.toggle('hidden', stepIndex === 0);
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.textContent = stepIndex === 3 ? t('generate') : t('next');
}

function findOptionsKey(fieldId, stepIndex) {
  // Map field ids to their i18n options array key
  const map = {
    legalForm: 'legalForms',
    country: 'countries',
    businessType: 'businessTypes',
    priceRange: 'priceRanges',
    targetCountries: 'targetCountriesOptions',
    returnPolicy: 'returnPolicies',
    warrantyType: 'warrantyTypes',
    paymentMethods: 'paymentMethodOptions',
    deliveryDelay: 'deliveryDelays',
    documentStyle: 'documentStyles',
    jurisdiction: 'jurisdictions'
  };
  return map[fieldId];
}

function buildFieldElement(f) {
  const wrap = document.createElement('div');
  wrap.className = 'form-group' + (f.fullWidth ? ' full-width' : '');
  wrap.dataset.fieldId = f.id;

  const labelText = t(f.labelKey);
  const reqMark = f.required ? '<span class="req">*</span>' : '';
  const placeholder = f.placeholderKey ? t(f.placeholderKey) : '';

  let inputHtml = '';

  if (f.type === 'text' || f.type === 'email') {
    const val = escapeAttr(state.formData[f.id] || '');
    inputHtml = `<input type="${f.type}" data-field="${f.id}" placeholder="${escapeAttr(placeholder)}" value="${val}">`;
  } else if (f.type === 'textarea') {
    const val = escapeHtml(state.formData[f.id] || '');
    inputHtml = `<textarea data-field="${f.id}" placeholder="${escapeAttr(placeholder)}" rows="3">${val}</textarea>`;
  } else if (f.type === 'select') {
    const current = state.formData[f.id];
    const opts = (f.options || []).map(opt =>
      `<option value="${escapeAttr(opt)}" ${current === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`
    ).join('');
    inputHtml = `
      <select data-field="${f.id}">
        <option value="">—</option>
        ${opts}
      </select>`;
  } else if (f.type === 'checkboxes') {
    const current = Array.isArray(state.formData[f.id]) ? state.formData[f.id] : [];
    inputHtml = `<div class="checkbox-group" data-field="${f.id}">` +
      f.options.map(opt => {
        const checked = current.includes(opt);
        return `<label class="checkbox-item ${checked ? 'checked' : ''}">
          <input type="checkbox" value="${escapeAttr(opt)}" ${checked ? 'checked' : ''}>
          <span>${escapeHtml(opt)}</span>
        </label>`;
      }).join('') +
      `</div>`;
  } else if (f.type === 'output-lang') {
    const L = i18n[state.currentLang];
    const current = state.formData.outputLanguage || 'FR';
    inputHtml = `<div class="output-lang-toggle" data-field="${f.id}">` +
      L.outputLanguageValues.map((val, i) => {
        return `<button type="button" class="output-lang-btn ${current === val ? 'active' : ''}" data-value="${val}">
          ${escapeHtml(L.outputLanguageOptions[i])}
        </button>`;
      }).join('') +
      `</div>`;
  }

  wrap.innerHTML = `
    <label>${escapeHtml(labelText)}${reqMark}</label>
    ${inputHtml}
    <div class="field-error">${t('required')}</div>
  `;

  // Wire interactions for checkboxes / output-lang to reflect class state
  setTimeout(() => {
    if (f.type === 'checkboxes') {
      const items = wrap.querySelectorAll('.checkbox-item');
      items.forEach(it => {
        const input = it.querySelector('input');
        input.addEventListener('change', () => {
          it.classList.toggle('checked', input.checked);
        });
      });
    }
    if (f.type === 'output-lang') {
      const btns = wrap.querySelectorAll('.output-lang-btn');
      btns.forEach(b => {
        b.addEventListener('click', (e) => {
          e.preventDefault();
          btns.forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          state.formData.outputLanguage = b.dataset.value;
        });
      });
    }
  }, 0);

  return wrap;
}

/* =========================================================================
   DATA / VALIDATION
   ========================================================================= */
function collectStepData(stepIndex, silent = false) {
  const fields = getStepFields(stepIndex).filter(f => f.id);
  const container = document.getElementById('formContainer');

  for (const f of fields) {
    const el = container.querySelector(`[data-field="${f.id}"]`);
    if (!el) continue;

    if (f.type === 'text' || f.type === 'email' || f.type === 'textarea') {
      state.formData[f.id] = el.value.trim();
    } else if (f.type === 'select') {
      state.formData[f.id] = el.value;
    } else if (f.type === 'checkboxes') {
      const checked = el.querySelectorAll('input[type="checkbox"]:checked');
      state.formData[f.id] = Array.from(checked).map(c => c.value);
    } else if (f.type === 'output-lang') {
      const active = el.querySelector('.output-lang-btn.active');
      state.formData.outputLanguage = active ? active.dataset.value : 'FR';
    }
  }
}

function validateStep(stepIndex) {
  collectStepData(stepIndex);
  const fields = getStepFields(stepIndex).filter(f => f.id && f.required);
  const container = document.getElementById('formContainer');
  let firstErrorEl = null;
  let valid = true;

  // Clear previous errors
  container.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));

  for (const f of fields) {
    if (f.conditionalOn) {
      const currentVal = state.formData[f.conditionalOn.id];
      const opts = i18n[state.currentLang][findOptionsKey(f.conditionalOn.id, stepIndex)] || [];
      const expected = opts[f.conditionalOn.valueIndex];
      if (currentVal !== expected) continue;
    }

    const val = state.formData[f.id];
    let bad = false;
    if (f.type === 'checkboxes') {
      bad = !Array.isArray(val) || val.length === 0;
    } else if (f.type === 'email') {
      bad = !val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    } else {
      bad = !val || (typeof val === 'string' && !val.trim());
    }

    if (bad) {
      valid = false;
      const grp = container.querySelector(`.form-group[data-field-id="${f.id}"]`);
      if (grp) {
        grp.classList.add('has-error');
        const errSpan = grp.querySelector('.field-error');
        if (errSpan) {
          errSpan.textContent = f.type === 'email' && val
            ? t('requiredEmail')
            : (f.type === 'checkboxes' ? t('chooseAtLeastOne') : t('required'));
        }
        if (!firstErrorEl) firstErrorEl = grp;
      }
    }
  }

  if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return valid;
}

/* =========================================================================
   NAVIGATION
   ========================================================================= */
function goToStep(index) {
  if (index < 0 || index > 3) return;
  state.currentStep = index;
  document.getElementById('generationPanel').classList.add('hidden');
  document.getElementById('formContainer').classList.remove('hidden');
  document.getElementById('navButtons').classList.remove('hidden');
  renderSidebarSteps();
  renderHeader();
  renderStep(index);
}

function handleNext() {
  if (state.currentStep < 3) {
    if (!validateStep(state.currentStep)) return;
    goToStep(state.currentStep + 1);
  } else {
    if (!validateStep(3)) return;
    startGeneration();
  }
}

function handlePrev() {
  if (state.currentStep === 0) return;
  collectStepData(state.currentStep, true);
  goToStep(state.currentStep - 1);
}

/* =========================================================================
   GENERATION
   ========================================================================= */
async function startGeneration() {
  state.isGenerating = true;
  state.generationDone = false;
  state.generatedContent = '';

  document.getElementById('formContainer').classList.add('hidden');
  document.getElementById('navButtons').classList.add('hidden');
  const panel = document.getElementById('generationPanel');
  panel.classList.remove('hidden');
  panel.classList.add('fade-in');

  const spinner = document.getElementById('spinner');
  spinner.className = 'spinner';
  document.getElementById('genMessage').textContent = t('generating');
  document.getElementById('wordCount').textContent = '';
  document.getElementById('previewLabel').textContent = t('preview');

  const preview = document.getElementById('previewContent');
  preview.textContent = '';
  preview.classList.add('streaming');

  ['exportDocx', 'exportPdf', 'regenerateBtn'].forEach(id => {
    document.getElementById(id).disabled = true;
  });

  // Update i18n on buttons
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (i18n[state.currentLang][k]) el.textContent = t(k);
  });

  // Subscribe to chunks
  if (state.unsubscribeChunk) state.unsubscribeChunk();
  state.unsubscribeChunk = window.electronAPI.onGenerationChunk(handleChunk);

  try {
    const fullText = await window.electronAPI.generateCGV(state.formData);
    if (fullText && fullText.length > state.generatedContent.length) {
      // Ensure final state matches
      const remaining = fullText.slice(state.generatedContent.length);
      if (remaining) handleChunk(remaining);
    }
    finishGeneration(true);
  } catch (err) {
    finishGeneration(false, err);
  }
}

function handleChunk(text) {
  state.generatedContent += text;
  const preview = document.getElementById('previewContent');
  preview.textContent = state.generatedContent;
  preview.scrollTop = preview.scrollHeight;
  const words = state.generatedContent.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById('wordCount').textContent = `${words.toLocaleString()} ${t('words')}`;
}

function finishGeneration(success, err) {
  state.isGenerating = false;
  if (state.unsubscribeChunk) {
    state.unsubscribeChunk();
    state.unsubscribeChunk = null;
  }

  const preview = document.getElementById('previewContent');
  preview.classList.remove('streaming');
  const spinner = document.getElementById('spinner');

  if (success) {
    state.generationDone = true;
    spinner.className = 'spinner done';
    document.getElementById('genMessage').textContent = t('generationDone');
    ['exportDocx', 'exportPdf', 'regenerateBtn'].forEach(id => {
      document.getElementById(id).disabled = false;
    });
    updateProgress();
  } else {
    spinner.className = 'spinner error';
    let msgKey = 'errorGeneric';
    const m = (err?.message || '').toString();
    if (m.includes('CLAUDE_NOT_FOUND')) msgKey = 'errorClaudeNotFound';
    else if (m.includes('CLAUDE_AUTH_ERROR')) msgKey = 'errorAuth';
    document.getElementById('genMessage').textContent = t(msgKey);
    showError(msgKey, m && !m.startsWith('CLAUDE_') ? m : null);
    document.getElementById('regenerateBtn').disabled = false;
  }
}

/* =========================================================================
   EXPORTS
   ========================================================================= */
async function exportDocx() {
  if (!state.generatedContent) return;
  try {
    const result = await window.electronAPI.saveDocx({
      content: state.generatedContent,
      companyName: state.formData.companyName || 'Company',
      language: state.formData.outputLanguage || 'FR'
    });
    if (result) {
      showToast(t('savedAs'));
    }
  } catch (e) {
    showToast(e.message || t('errorGeneric'), true);
  }
}

async function exportPdf() {
  if (!state.generatedContent) return;
  // Switch preview to a print-friendly view, print, then restore
  const preview = document.getElementById('previewContent');
  const original = preview.style.cssText;
  preview.style.cssText = original + ';color:#000;background:#fff;font-family:Garamond,Georgia,serif;font-size:14px;padding:30px;';
  document.body.style.background = '#fff';

  try {
    const result = await window.electronAPI.printToPDF({
      companyName: state.formData.companyName || 'Company'
    });
    if (result) showToast(t('savedAs'));
  } catch (e) {
    showToast(e.message || t('errorGeneric'), true);
  } finally {
    preview.style.cssText = original;
    document.body.style.background = '';
  }
}

async function copyContent() {
  if (!state.generatedContent) return;
  try {
    await navigator.clipboard.writeText(state.generatedContent);
    const btn = document.getElementById('copyBtn');
    const original = btn.textContent;
    btn.textContent = t('copied');
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch {
    showToast('Copy failed', true);
  }
}

function regenerate() {
  startGeneration();
}

/* =========================================================================
   UI: ERROR MODAL + TOAST
   ========================================================================= */
function showError(msgKey, extra) {
  document.getElementById('errorTitle').textContent = t('errorTitle');
  const msg = t(msgKey) + (extra ? '\n\n' + extra : '');
  document.getElementById('errorMessage').textContent = msg;
  document.getElementById('errorModal').classList.remove('hidden');
}

let toastTimer = null;
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.classList.toggle('error', isError);
  document.getElementById('toastMsg').textContent = msg;
  el.classList.remove('hidden');
  // force reflow for transition restart
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 350);
  }, 2600);
}

/* =========================================================================
   LANG TOGGLE
   ========================================================================= */
function setLang(lang) {
  if (lang === state.currentLang) return;
  // Save current step data before switching
  if (!document.getElementById('formContainer').classList.contains('hidden')) {
    collectStepData(state.currentStep, true);
  }
  state.currentLang = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  renderSidebarSteps();
  renderHeader();

  if (!document.getElementById('formContainer').classList.contains('hidden')) {
    renderStep(state.currentStep);
  } else {
    // Generation panel is open — refresh its labels
    document.getElementById('previewLabel').textContent = t('preview');
    document.getElementById('genMessage').textContent =
      state.generationDone ? t('generationDone')
      : state.isGenerating ? t('generating')
      : document.getElementById('genMessage').textContent;
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (i18n[state.currentLang][k]) el.textContent = t(k);
  });

  document.getElementById('nextBtn').textContent = state.currentStep === 3 ? t('generate') : t('next');
  document.getElementById('prevBtn').textContent = t('back');
}

/* =========================================================================
   HELPERS
   ========================================================================= */
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(str) { return escapeHtml(str); }

/* =========================================================================
   INIT
   ========================================================================= */
function init() {
  document.getElementById('nextBtn').addEventListener('click', handleNext);
  document.getElementById('prevBtn').addEventListener('click', handlePrev);
  document.getElementById('exportDocx').addEventListener('click', exportDocx);
  document.getElementById('exportPdf').addEventListener('click', exportPdf);
  document.getElementById('regenerateBtn').addEventListener('click', regenerate);
  document.getElementById('copyBtn').addEventListener('click', copyContent);
  document.getElementById('backToFormBtn').addEventListener('click', () => goToStep(3));
  document.getElementById('errorClose').addEventListener('click', () => {
    document.getElementById('errorModal').classList.add('hidden');
  });

  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });

  // Enter key on text inputs in form -> next
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      const inForm = !document.getElementById('formContainer').classList.contains('hidden');
      if (inForm) {
        e.preventDefault();
        handleNext();
      }
    }
  });

  renderSidebarSteps();
  renderHeader();
  renderStep(0);
}

document.addEventListener('DOMContentLoaded', init);
