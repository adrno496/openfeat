// src/renderer/dashboard.js — Dashboard et vue module
window.Dashboard = (() => {

  const MODULES = [
    { id: 'business-plan',  icon: '📊', name: 'Business Plan',     desc: 'Plan structuré prêt investisseur' },
    { id: 'invoice',        icon: '🧾', name: 'Facture PDF',       desc: 'Facture conforme + email d\'envoi' },
    { id: 'proposal',       icon: '📝', name: 'Proposition',       desc: 'Proposition commerciale gagnante' },
    { id: 'email-campaign', icon: '✉️', name: 'Email Campaign',    desc: 'Séquence 5 emails optimisée' },
    { id: 'legal',          icon: '⚖️', name: 'Documents Légaux',  desc: 'CGV, mentions, RGPD, NDA' },
    { id: 'forecast',       icon: '📈', name: 'Forecast 3 ans',    desc: 'Prévisionnel financier détaillé' },
    { id: 'cold-email',     icon: '🎯', name: 'Cold Email B2B',    desc: 'Séquence 4 touches outbound' },
    { id: 'meeting',        icon: '🎤', name: 'Résumé Réunion',    desc: 'Transcript → CR actionnable' },
    { id: 'gtm',            icon: '🚀', name: 'Go-to-Market',      desc: 'Plan GTM 90 jours opérationnel' },
    { id: 'sop',            icon: '📋', name: 'Procédure SOP',     desc: 'Documentation de processus' },
    { id: 'pdf-analyzer',   icon: '🔍', name: 'Analyse PDF',       desc: 'Contrats, factures, devis, rapports' },
    { id: 'pdf-compare',    icon: '🔀', name: 'Comparer 2 PDF',    desc: 'Détecte les différences entre 2 versions' },
    { id: 'social-post',         icon: '📱', name: 'Posts sociaux',          desc: 'LinkedIn, IG, TikTok, FB, X, Threads' },
    { id: 'content-plan',        icon: '🗓️', name: 'Planning de contenu',   desc: 'Calendrier éditorial 4-8 semaines' },
    { id: 'social-audit',        icon: '🔬', name: 'Audit réseaux sociaux', desc: 'Diagnostic + plan d\'action 30j' },
    { id: 'newsletter',          icon: '📰', name: 'Newsletter',             desc: 'Sujet, hook et corps prêt à envoyer' },
    { id: 'research-watch',      icon: '🛰️', name: 'Recherche & veille',    desc: 'Synthèse structurée d\'un sujet' },
    { id: 'canva-brief',         icon: '🎨', name: 'Brief visuel Canva',    desc: 'Prompt + specs prêtes pour Canva' },
    { id: 'file-organization',   icon: '📁', name: 'Organisation fichiers', desc: 'Arborescence + nommage + migration' },
    { id: 'drive-organization',  icon: '☁️', name: 'Organisation Drive',    desc: 'Plan Google Drive + Apps Script' },
    { id: 'folder-analyzer',     icon: '🔭', name: 'Analyse de dossier',   desc: 'Audit stratégique d\'un dossier projet complet' }
  ];

  const FORMS = {
    'business-plan': [
      { name: 'idea', label: 'Idée / projet', type: 'textarea' },
      { name: 'market', label: 'Marché ciblé', type: 'text' },
      { name: 'team', label: 'Équipe', type: 'text' },
      { name: 'funding', label: 'Financement recherché', type: 'text' },
      { name: 'revenue', label: 'Modèle de revenu', type: 'text' }
    ],
    'invoice': [
      { name: 'invoiceNumber', label: 'N° facture *', type: 'text' },
      { name: 'issueDate',     label: 'Date d\'émission', type: 'text' },
      { name: 'dueDate',       label: 'Date d\'échéance', type: 'text' },
      { name: 'currency',      label: 'Devise (laissez vide = profil)', type: 'select', options: [
        { value: '',    label: 'Devise du profil' },
        { value: 'EUR', label: '€ EUR' },
        { value: 'USD', label: '$ USD' },
        { value: 'GBP', label: '£ GBP' },
        { value: 'CHF', label: 'CHF' },
        { value: 'CAD', label: '$ CAD' },
        { value: 'MAD', label: 'MAD' },
        { value: 'XOF', label: 'FCFA' }
      ]},
      { name: 'clientName',    label: 'Nom du client *', type: 'text' },
      { name: 'clientType',    label: 'Type de client', type: 'select', options: [
        { value: 'B2B',         label: 'Entreprise (B2B)' },
        { value: 'B2C',         label: 'Particulier (B2C)' },
        { value: 'B2G',         label: 'Collectivité / public' },
        { value: 'B2B-UE-intra',label: 'Entreprise UE (intracom)' }
      ]},
      { name: 'clientAddress', label: 'Adresse client', type: 'textarea', rows: 2 },
      { name: 'clientEmail',   label: 'Email client', type: 'email' },
      { name: 'clientVatNumber', label: 'N° TVA client (si UE intracom)', type: 'text' },
      { name: 'lines',         label: 'Lignes de facture (1 par ligne, format : Description | Qté | PU HT | TVA%)', type: 'textarea', rows: 6, placeholder: 'Conseil stratégique | 5 | 800 | 20\nFormation | 2 | 1200 | 0' },
      { name: 'description',   label: 'Description simple (si pas de lignes détaillées)', type: 'textarea', rows: 2 },
      { name: 'amount',        label: 'Montant unique (si pas de lignes détaillées)', type: 'number' },
      { name: 'deposit',       label: 'Acompte déjà versé', type: 'number' },
      { name: 'paymentTerms',  label: 'Conditions de paiement', type: 'text' },
      { name: 'note',          label: 'Note pour le client (optionnel)', type: 'textarea', rows: 2 }
    ],
    'proposal': [
      { name: 'clientName', label: 'Client', type: 'text' },
      { name: 'clientType', label: 'Type de client', type: 'select', options: [
        { value: 'B2B',          label: 'Entreprise (B2B)' },
        { value: 'B2C',          label: 'Particulier (B2C)' },
        { value: 'collectivite', label: 'Collectivité / public' },
        { value: 'asso',         label: 'Association / ONG' },
        { value: 'startup',      label: 'Startup' }
      ]},
      { name: 'clientIndustry', label: 'Industrie / contexte client', type: 'text' },
      { name: 'clientNeed',  label: 'Besoin client', type: 'textarea', rows: 3 },
      { name: 'solution',    label: 'Solution proposée', type: 'textarea', rows: 3 },
      { name: 'price',       label: 'Prix', type: 'text' },
      { name: 'timeline',    label: 'Délai', type: 'text' },
      { name: 'competitors', label: 'Concurrents en compétition (optionnel)', type: 'text' },
      { name: 'objections',  label: 'Objections probables à anticiper', type: 'textarea', rows: 2 },
      { name: 'format',      label: 'Format', type: 'select', options: [
        { value: 'court',     label: 'Standard (3-5 pages)' },
        { value: 'one_pager', label: 'One-pager (1 page synthèse)' },
        { value: 'complet',   label: 'Dossier complet (5-10 pages)' },
        { value: 'rfp',       label: 'Réponse appel d\'offres formel' }
      ]}
    ],
    'email-campaign': [
      { name: 'objective', label: 'Objectif de la séquence', type: 'select', options: [
        { value: 'lancement',   label: 'Lancement produit / service' },
        { value: 'nurture',     label: 'Nurturing / éducation longue' },
        { value: 'reactivation',label: 'Réactivation abonnés inactifs' },
        { value: 'panier',      label: 'Abandon de panier (e-com)' },
        { value: 'webinar',     label: 'Inscription webinar / événement' },
        { value: 'onboarding',  label: 'Onboarding nouveau client' }
      ]},
      { name: 'emailCount', label: 'Nombre d\'emails', type: 'select', options: [
        { value: '3', label: '3 emails' },
        { value: '5', label: '5 emails (standard)' },
        { value: '7', label: '7 emails' },
        { value: '10', label: '10 emails (long nurture)' }
      ]},
      { name: 'spacing',  label: 'Espacement entre emails', type: 'text', placeholder: '2-3 jours / 1 par semaine / etc.' },
      { name: 'platform', label: 'Plateforme d\'envoi', type: 'text', placeholder: 'Mailchimp / Brevo / ConvertKit / Beehiiv…' },
      { name: 'product',  label: 'Produit/service', type: 'text' },
      { name: 'audience', label: 'Audience', type: 'text' },
      { name: 'benefit',  label: 'Bénéfice principal', type: 'text' },
      { name: 'price',    label: 'Prix', type: 'text' },
      { name: 'ctaUrl',   label: 'URL du CTA', type: 'url' },
      { name: 'tokens',   label: 'Tokens de personnalisation supportés', type: 'text', placeholder: '{{firstName}}, {{company}}' }
    ],
    'legal': [
      { name: 'docType', label: 'Type de document', type: 'select', options: [
        { value: 'cgv', label: 'CGV' },
        { value: 'mentions', label: 'Mentions légales' },
        { value: 'privacy', label: 'Politique de confidentialité' },
        { value: 'nda', label: 'NDA' },
        { value: 'contrat', label: 'Contrat de prestation' }
      ]},
      { name: 'businessType', label: 'Type d\'activité', type: 'text' },
      { name: 'services', label: 'Services / produits', type: 'textarea' }
    ],
    'forecast': [
      { name: 'modelType', label: 'Type de modèle financier *', type: 'select', options: [
        { value: 'saas',           label: 'SaaS / abonnement récurrent B2B' },
        { value: 'abonnement_b2c', label: 'Abonnement B2C (box, app, contenu)' },
        { value: 'unitaire',       label: 'Vente à l\'unité (commerce, e-com, restau)' },
        { value: 'honoraires',     label: 'Honoraires (freelance, conseil, agence)' },
        { value: 'mix',            label: 'Mixte (récurrent + ponctuel)' },
        { value: 'marketplace',    label: 'Marketplace (commission sur GMV)' }
      ]},
      { name: 'monthlyPrice', label: 'Prix moyen / panier moyen', type: 'number' },
      { name: 'initialCustomers', label: 'Clients ou ventes initiales', type: 'number' },
      { name: 'growthRate', label: 'Croissance mensuelle visée (%)', type: 'number' },
      { name: 'churnRate',  label: 'Taux de churn mensuel % (SaaS/abo)', type: 'number' },
      { name: 'grossMargin',label: 'Marge brute moyenne %', type: 'number' },
      { name: 'fixedCosts', label: 'Charges fixes mensuelles', type: 'number' },
      { name: 'cac',        label: 'Coût d\'acquisition par client (CAC)', type: 'number' },
      { name: 'initialCash',label: 'Trésorerie de départ', type: 'number' },
      { name: 'extraNotes', label: 'Notes / hypothèses spécifiques (saisonnalité, salaires, etc.)', type: 'textarea', rows: 3 }
    ],
    'cold-email': [
      { name: 'channel', label: 'Canal principal', type: 'select', options: [
        { value: 'email',    label: 'Email' },
        { value: 'linkedin', label: 'LinkedIn DM / InMail' },
        { value: 'cold_call',label: 'Script appel à froid' },
        { value: 'multi',    label: 'Multi-canal séquentiel' }
      ]},
      { name: 'touches',    label: 'Nombre de touches', type: 'select', options: [
        { value: '3', label: '3 touches' },
        { value: '4', label: '4 touches (recommandé)' },
        { value: '5', label: '5 touches' },
        { value: '7', label: '7 touches (long nurture)' }
      ]},
      { name: 'formality',  label: 'Formalité', type: 'select', options: [
        { value: 'tu',   label: 'Tutoiement (tech/startup/créatif)' },
        { value: 'vous', label: 'Vouvoiement (corporate/institutionnel)' }
      ]},
      { name: 'targetRole',     label: 'Rôle ciblé', type: 'text' },
      { name: 'targetIndustry', label: 'Industrie cible', type: 'text' },
      { name: 'market',         label: 'Pays / marché cible', type: 'text' },
      { name: 'painPoint',  label: 'Pain point', type: 'textarea', rows: 3 },
      { name: 'solution',   label: 'Solution apportée', type: 'text' },
      { name: 'proof',      label: 'Preuve sociale / résultat à citer', type: 'text' },
      { name: 'senderName', label: 'Expéditeur', type: 'text' }
    ],
    'meeting': [
      { name: 'meetingTitle', label: 'Titre / objet de la réunion', type: 'text' },
      { name: 'meetingDate',  label: 'Date', type: 'text' },
      { name: 'participants', label: 'Participants', type: 'text' },
      { name: 'meetingType',  label: 'Type', type: 'select', options: [
        { value: 'client',     label: 'Réunion client' },
        { value: 'prospect',   label: 'Découverte / prospect' },
        { value: 'interne',    label: 'Interne / équipe' },
        { value: 'partenaire', label: 'Partenaire / fournisseur' },
        { value: 'investisseur', label: 'Investisseur' },
        { value: 'autre',      label: 'Autre' }
      ]},
      { name: 'objectives',   label: 'Objectifs annoncés (optionnel)', type: 'text' },
      { name: '__audioPicker', label: 'Transcrire un audio (Whisper, nécessite OPENAI_API_KEY)', type: 'audio-picker' },
      { name: 'transcript',   label: 'Transcript brut (sera rempli automatiquement après transcription)', type: 'textarea', rows: 10 }
    ],
    'gtm': [
      { name: 'product', label: 'Produit', type: 'text' },
      { name: 'targetAudience', label: 'Audience cible', type: 'text' },
      { name: 'budget', label: 'Budget de lancement', type: 'text' },
      { name: 'timeline', label: 'Délai de lancement', type: 'text' },
      { name: 'competitors', label: 'Concurrents', type: 'text' }
    ],
    'sop': [
      { name: 'processName', label: 'Nom du processus', type: 'text' },
      { name: 'frequency', label: 'Fréquence', type: 'select', options: [
        { value: 'à la demande',   label: 'À la demande / ad-hoc' },
        { value: 'quotidienne',    label: 'Quotidienne' },
        { value: 'hebdomadaire',   label: 'Hebdomadaire' },
        { value: 'mensuelle',      label: 'Mensuelle' },
        { value: 'trimestrielle',  label: 'Trimestrielle' },
        { value: 'annuelle',       label: 'Annuelle' }
      ]},
      { name: 'duration',  label: 'Temps approximatif d\'exécution', type: 'text' },
      { name: 'steps', label: 'Étapes principales connues', type: 'textarea', rows: 4 },
      { name: 'tools', label: 'Outils utilisés', type: 'text' },
      { name: 'responsible', label: 'Responsable', type: 'text' },
      { name: 'successCriteria', label: 'Critère de réussite', type: 'textarea', rows: 2 }
    ],
    'folder-analyzer': [
      { name: 'folderPath', label: 'Dossier à analyser (laissez vide pour utiliser le dossier de travail du profil)', type: 'folder-picker' },
      { name: 'analysisType', label: 'Type d\'analyse', type: 'select', options: [
        { value: 'overview',   label: 'Vue d\'ensemble (audit global)' },
        { value: 'gaps',       label: 'Détection des manques' },
        { value: 'strategy',   label: 'Vision stratégique 6-12 mois' },
        { value: 'roadmap',    label: 'Roadmap 90 jours' },
        { value: 'inventory',  label: 'Inventaire et tri du dossier' }
      ]},
      { name: 'objective', label: 'Objectif particulier (optionnel)', type: 'textarea', rows: 3 }
    ],
    'pdf-compare': [
      { name: 'filePathA', label: 'Document A (version originale)', type: 'pdf-picker', slot: 'A' },
      { name: 'filePathB', label: 'Document B (version à comparer)', type: 'pdf-picker', slot: 'B' },
      { name: 'focus', label: 'Focus particulier (optionnel)', type: 'textarea', rows: 3 }
    ],
    'social-post': [
      { name: 'platform', label: 'Plateforme', type: 'select', options: [
        { value: 'linkedin',  label: 'LinkedIn' },
        { value: 'facebook',  label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok',    label: 'TikTok' },
        { value: 'twitter',   label: 'X / Twitter' },
        { value: 'threads',   label: 'Threads' }
      ]},
      { name: 'topic',     label: 'Sujet / message principal', type: 'textarea', rows: 3 },
      { name: 'goal',      label: 'Objectif (engagement, leads, notoriété…)', type: 'text' },
      { name: 'audience',  label: 'Audience visée', type: 'text' },
      { name: 'angle',     label: 'Angle / point de vue', type: 'text' },
      { name: 'cta',       label: 'CTA souhaité', type: 'text' },
      { name: 'keyPoints', label: 'Points clés à inclure (optionnel)', type: 'textarea', rows: 3 },
      { name: 'variants',  label: 'Nombre de variantes (1-5)', type: 'number' }
    ],
    'content-plan': [
      { name: 'expertise',  label: 'Expertise / sujet principal', type: 'text' },
      { name: 'platforms',  label: 'Plateformes prioritaires', type: 'text' },
      { name: 'audience',   label: 'Audience', type: 'text' },
      { name: 'cadence',    label: 'Cadence (ex: 3-4 posts/semaine)', type: 'text' },
      { name: 'period',     label: 'Période (ex: 4 semaines)', type: 'text' },
      { name: 'objective',  label: 'Objectif business', type: 'text' },
      { name: 'themes',     label: 'Thèmes obligatoires (optionnel)', type: 'textarea', rows: 2 },
      { name: 'constraints',label: 'Sujets à éviter (optionnel)', type: 'textarea', rows: 2 }
    ],
    'social-audit': [
      { name: 'platforms',     label: 'Plateforme(s) auditée(s)', type: 'text' },
      { name: 'handles',       label: 'Handles / URLs profil', type: 'text' },
      { name: 'niche',         label: 'Niche / secteur', type: 'text' },
      { name: 'bio',           label: 'Bio actuelle (collez le texte)', type: 'textarea', rows: 3 },
      { name: 'followers',     label: 'Nombre de followers', type: 'text' },
      { name: 'postCount',     label: 'Nombre de posts publiés', type: 'text' },
      { name: 'engagement',    label: 'Engagement moyen (likes, commentaires)', type: 'text' },
      { name: 'timespan',      label: 'Depuis quand actif', type: 'text' },
      { name: 'contentTypes',  label: 'Types de contenu publiés', type: 'textarea', rows: 2 },
      { name: 'businessGoals', label: 'Objectifs business via les RS', type: 'textarea', rows: 2 },
      { name: 'competitors',   label: 'Concurrents / références', type: 'text' }
    ],
    'newsletter': [
      { name: 'topic',           label: 'Sujet / angle', type: 'textarea', rows: 2 },
      { name: 'newsletterType',  label: 'Type', type: 'select', options: [
        { value: 'éducatif',    label: 'Éducatif / how-to' },
        { value: 'opinion',     label: 'Opinion / vision' },
        { value: 'curation',    label: 'Curation / digest' },
        { value: 'storytelling',label: 'Storytelling personnel' },
        { value: 'analyse',     label: 'Analyse marché' }
      ]},
      { name: 'audience',  label: 'Audience', type: 'text' },
      { name: 'objective', label: 'Objectif business', type: 'text' },
      { name: 'length',    label: 'Longueur souhaitée (mots)', type: 'text' },
      { name: 'tone',      label: 'Ton (libre, perso, expert…)', type: 'text' },
      { name: 'keyPoints', label: 'Points clés à intégrer', type: 'textarea', rows: 3 },
      { name: 'cta',       label: 'CTA en fin de newsletter', type: 'text' },
      { name: 'references',label: 'Références à citer', type: 'textarea', rows: 2 }
    ],
    'research-watch': [
      { name: 'subject',      label: 'Sujet précis', type: 'textarea', rows: 2 },
      { name: 'angle',        label: 'Angle / question business', type: 'text' },
      { name: 'context',      label: 'Pourquoi tu veux savoir', type: 'textarea', rows: 2 },
      { name: 'depth',        label: 'Profondeur (synthèse, dossier complet…)', type: 'text' },
      { name: 'keyQuestions', label: 'Questions précises à couvrir', type: 'textarea', rows: 4 },
      { name: 'knownActors',  label: 'Acteurs/sources que tu connais déjà', type: 'textarea', rows: 2 }
    ],
    'canva-brief': [
      { name: 'format', label: 'Format', type: 'select', options: [
        { value: 'post-linkedin',  label: 'Post LinkedIn (carré ou portrait)' },
        { value: 'post-instagram', label: 'Post Instagram feed' },
        { value: 'story',          label: 'Story IG/FB (vertical)' },
        { value: 'reel-cover',     label: 'Reel/TikTok cover' },
        { value: 'thumbnail-yt',   label: 'Thumbnail YouTube' },
        { value: 'banniere-li',    label: 'Bannière LinkedIn' },
        { value: 'carrousel-li',   label: 'Carrousel LinkedIn' },
        { value: 'carrousel-ig',   label: 'Carrousel Instagram' },
        { value: 'document',       label: 'Document A4' },
        { value: 'autre',          label: 'Autre' }
      ]},
      { name: 'objective', label: 'Objectif du visuel', type: 'text' },
      { name: 'message',   label: 'Sujet / message principal', type: 'textarea', rows: 2 },
      { name: 'mainText',  label: 'Texte principal à afficher', type: 'text' },
      { name: 'subText',   label: 'Sous-texte / éléments secondaires', type: 'text' },
      { name: 'cta',       label: 'CTA visible (si présent)', type: 'text' },
      { name: 'style',     label: 'Style (minimaliste, coloré, corporate…)', type: 'text' },
      { name: 'colors',    label: 'Couleurs imposées (hex ou nom)', type: 'text' },
      { name: 'reference', label: 'Référence / inspiration (URL, marque…)', type: 'text' }
    ],
    'file-organization': [
      { name: 'platform', label: 'Plateforme', type: 'select', options: [
        { value: 'local',   label: 'Local (Mac/PC)' },
        { value: 'icloud',  label: 'iCloud' },
        { value: 'dropbox', label: 'Dropbox' },
        { value: 'drive',   label: 'Google Drive' },
        { value: 'onedrive',label: 'OneDrive' }
      ]},
      { name: 'volume',       label: 'Volumétrie estimée', type: 'text' },
      { name: 'fileTypes',    label: 'Types de fichiers principaux', type: 'text' },
      { name: 'currentState', label: 'État actuel du fouillis', type: 'textarea', rows: 4 },
      { name: 'projects',     label: 'Domaines / projets en cours', type: 'textarea', rows: 2 },
      { name: 'sharing',      label: 'Collaborations / partages', type: 'text' },
      { name: 'constraints',  label: 'Contraintes (RGPD, archivage légal…)', type: 'text' }
    ],
    'drive-organization': [
      { name: 'usage',         label: 'Contexte d\'usage principal', type: 'textarea', rows: 2 },
      { name: 'volume',        label: 'Volume actuel', type: 'text' },
      { name: 'collaborators', label: 'Collaborateurs (sous-traitants, comptable…)', type: 'text' },
      { name: 'workspace',     label: 'Type de compte (Google standard / Workspace)', type: 'text' },
      { name: 'painPoints',    label: 'Problèmes actuels', type: 'textarea', rows: 3 },
      { name: 'docTypes',      label: 'Catégories principales de documents', type: 'textarea', rows: 2 },
      { name: 'connectedApps', label: 'Apps connectées utilisées', type: 'text' },
      { name: 'priority',      label: 'Ce qui doit être trouvable rapidement', type: 'textarea', rows: 2 }
    ],
    'pdf-analyzer': [
      { name: 'filePath', label: 'Fichier PDF', type: 'pdf-picker' },
      { name: 'docType', label: 'Type de document', type: 'select', options: [
        { value: 'auto', label: 'Détection automatique' },
        { value: 'contrat', label: 'Contrat' },
        { value: 'facture', label: 'Facture' },
        { value: 'devis', label: 'Devis' },
        { value: 'rapport', label: 'Rapport / document long' }
      ]},
      { name: 'questions', label: 'Questions spécifiques (optionnel)', type: 'textarea', rows: 4 }
    ]
  };

  function getModule(id) { return MODULES.find((m) => m.id === id); }
  function getModules() { return MODULES; }

  // ---------- Dashboard ----------
  const MODULE_GROUPS = [
    { title: 'Création de documents', ids: ['business-plan', 'proposal', 'invoice', 'legal', 'forecast', 'sop'] },
    { title: 'Marketing & contenu',   ids: ['social-post', 'content-plan', 'newsletter', 'email-campaign', 'cold-email', 'canva-brief'] },
    { title: 'Analyse & stratégie',   ids: ['folder-analyzer', 'social-audit', 'research-watch', 'pdf-analyzer', 'pdf-compare', 'gtm', 'meeting'] },
    { title: 'Productivité',          ids: ['file-organization', 'drive-organization'] }
  ];

  async function renderDashboard(target) {
    const profile = await window.eos.getProfile().catch(() => ({}));
    // 1 seul appel : listAllRecent(50) suffit pour afficher 8 récents + stats 7j/30j
    // (50 derniers docs couvrent généralement les 30 derniers jours pour un solo)
    const recentsAll = await window.eos.listAllRecent(50).catch(() => []);
    const recents = recentsAll.slice(0, 8);
    const counts = await Promise.all(MODULES.map(async (m) => {
      try { return (await window.eos.listDocs(m.id)).length; } catch { return 0; }
    }));
    const countById = Object.fromEntries(MODULES.map((m, i) => [m.id, counts[i]]));

    // Stats agrégées (basées sur les 50 derniers — suffisant pour 90% des cas)
    const total = counts.reduce((s, n) => s + n, 0);
    const last7 = recentsAll.filter((r) => Date.now() - new Date(r.createdAt).getTime() < 7 * 86400000).length;
    const last30 = recentsAll.filter((r) => Date.now() - new Date(r.createdAt).getTime() < 30 * 86400000).length;
    const topModule = MODULES
      .map((m, i) => ({ m, n: counts[i] }))
      .sort((a, b) => b.n - a.n)[0];

    // Suggestions personnalisées (basées sur ce qui n'a JAMAIS été utilisé)
    const unused = MODULES.filter((m, i) => counts[i] === 0).slice(0, 3);

    const greeting = greetingFor(profile.founder || profile.name || '');
    target.innerHTML = `
      <div class="dash-header">
        <div>
          <div class="dash-greet">${greeting}</div>
          <div class="dash-sub">${profile.name ? `${profile.name}${profile.industry ? ' · ' + profile.industry : ''}` : 'Bienvenue dans EntrepreneurOS'}</div>
        </div>
        <button class="btn btn-primary" id="dash-cmd-btn">⌘ K · Que veux-tu faire ?</button>
      </div>

      <div class="dash-stats">
        <div class="dash-stat"><div class="ds-num">${total}</div><div class="ds-lab">documents au total</div></div>
        <div class="dash-stat"><div class="ds-num">${last7}</div><div class="ds-lab">cette semaine</div></div>
        <div class="dash-stat"><div class="ds-num">${last30}</div><div class="ds-lab">ce mois-ci</div></div>
        <div class="dash-stat"><div class="ds-num">${topModule ? topModule.m.icon : '·'}</div><div class="ds-lab">${topModule && topModule.n > 0 ? topModule.m.name : 'Module favori (à venir)'}</div></div>
      </div>

      <div id="dash-workspace-block"></div>

      ${unused.length ? `
      <section class="dash-suggestions">
        <h3>À découvrir</h3>
        <div class="suggestion-row">
          ${unused.map((m) => `
            <button class="suggestion-card" data-mod="${m.id}">
              <span class="sg-ico">${m.icon}</span>
              <div>
                <div class="sg-name">${m.name}</div>
                <div class="sg-desc">${m.desc}</div>
              </div>
            </button>`).join('')}
        </div>
      </section>` : ''}

      ${MODULE_GROUPS.map((g) => {
        const items = g.ids.map((id) => MODULES.find((m) => m.id === id)).filter(Boolean);
        if (!items.length) return '';
        return `
        <section class="dash-group">
          <h3>${g.title}</h3>
          <div class="modules-grid">
            ${items.map((m) => {
              const c = countById[m.id] || 0;
              return `<button class="mod-card" data-mod="${m.id}">
                <div class="mod-icon">${m.icon}</div>
                <div class="mod-name">${m.name}</div>
                <div class="mod-desc">${m.desc}</div>
                <div class="mod-count">${c > 0 ? `<strong>${c}</strong> document${c > 1 ? 's' : ''}` : '<span class="muted">jamais utilisé</span>'}</div>
              </button>`;
            }).join('')}
          </div>
        </section>`;
      }).join('')}

      <section class="recent-section">
        <h2>Derniers documents</h2>
        <div class="recent-list">
          ${recents.length ? recents.map((r) => {
            const m = getModule(r.module);
            return `<div class="recent-item" data-mod="${r.module}" data-id="${r.id}">
              <div class="recent-icon">${m ? m.icon : '·'}</div>
              <div class="recent-info">
                <div class="recent-mod">${m ? m.name : r.module}</div>
                <div class="recent-id muted">${summaryFor(r)}</div>
              </div>
              <div class="recent-date">${formatDate(r.createdAt)}</div>
            </div>`;
          }).join('') : '<div class="muted">Aucun document généré pour le moment.</div>'}
        </div>
      </section>`;

    target.querySelectorAll('.mod-card, .suggestion-card').forEach((el) => {
      el.addEventListener('click', () => window.App.navigate('module/' + el.dataset.mod));
    });
    target.querySelectorAll('.recent-item').forEach((el) => {
      el.addEventListener('click', () => window.App.navigate('module/' + el.dataset.mod + '/' + el.dataset.id));
    });
    const cmdBtn = document.getElementById('dash-cmd-btn');
    if (cmdBtn) cmdBtn.addEventListener('click', () => window.App.openCommandPalette());

    // Bloc Workspace (vue projet) — async
    renderWorkspaceBlock(profile);
  }

  async function renderWorkspaceBlock(profile) {
    const block = document.getElementById('dash-workspace-block');
    if (!block) return;
    if (!profile.workspacePath) {
      block.innerHTML = `
        <section class="dash-workspace dash-workspace-empty">
          <div>
            <h3 style="margin-bottom:6px">📁 Vue projet — non configurée</h3>
            <p class="muted" style="font-size:13px">Pointe l'app vers un dossier qui regroupe les fichiers de ton projet (Mac, iCloud, Dropbox local…) pour avoir une vue d'ensemble et enrichir tous les documents générés avec ce contexte.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="dash-ws-setup">Configurer un dossier de projet</button>
        </section>`;
      const btn = document.getElementById('dash-ws-setup');
      if (btn) btn.addEventListener('click', () => window.App.navigate('settings'));
      return;
    }

    block.innerHTML = `<section class="dash-workspace"><div class="muted" style="font-size:12px">⏳ Indexation du dossier de projet…</div></section>`;
    try {
      const r = await window.eos.scanWorkspace(profile.workspacePath, false);
      if (!r.ok) {
        block.innerHTML = `<section class="dash-workspace"><div class="muted" style="color:var(--red);font-size:12px">${r.error}</div></section>`;
        return;
      }
      const s = r.summary;
      const formatSize = (n) => { const u=['B','KB','MB','GB','TB']; let i=0; while(n>=1024 && i<u.length-1){n/=1024;i++;} return `${n.toFixed(n<10&&i>0?1:0)} ${u[i]}`; };
      const tagLabels = { contrat:'📄 Contrats', facture:'🧾 Factures', juridique:'⚖️ Juridique', finance:'💰 Finance', marketing:'📢 Marketing', client:'👤 Client', livrable:'📦 Livrables' };
      block.innerHTML = `
        <section class="dash-workspace">
          <div class="ws-head">
            <div>
              <h3>📁 ${s.rootName}</h3>
              <div class="muted" style="font-size:11px">${s.rootPath}</div>
            </div>
            <button class="btn btn-sm" id="dash-ws-rescan">🔄 Rescanner</button>
          </div>
          <div class="ws-summary-grid" style="margin-top:14px">
            <div class="ws-stat"><div class="ws-num">${s.totalFiles}</div><div class="ws-lab">fichiers</div></div>
            <div class="ws-stat"><div class="ws-num">${formatSize(s.totalSize)}</div><div class="ws-lab">volume</div></div>
            <div class="ws-stat"><div class="ws-num">${s.topDirs.length}</div><div class="ws-lab">sous-dossiers</div></div>
            <div class="ws-stat"><div class="ws-num">${(s.recent[0] ? new Date(s.recent[0].mtime).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '—')}</div><div class="ws-lab">dernière activité</div></div>
          </div>
          ${Object.keys(s.byTag).length ? `<div class="ws-block"><div class="ws-pills">${Object.entries(s.byTag).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<span class="ws-pill"><strong>${n}</strong> ${tagLabels[t]||t}</span>`).join('')}</div></div>` : ''}
        </section>`;
      const btn = document.getElementById('dash-ws-rescan');
      if (btn) btn.addEventListener('click', () => renderWorkspaceBlock(profile));
    } catch (e) {
      block.innerHTML = `<section class="dash-workspace"><div class="muted" style="color:var(--red);font-size:12px">${e.message}</div></section>`;
    }
  }

  // ---------- Vue Module ----------
  let currentDoc = null;
  const FORM_DRAFT_KEY = (id) => `eos.draft.${id}`;

  async function renderModule(target, moduleId, openDocId) {
    const mod = getModule(moduleId);
    if (!mod) { target.innerHTML = '<div class="card">Module inconnu.</div>'; return; }
    const fields = FORMS[moduleId] || [];
    currentDoc = null;
    target.innerHTML = `
      <div class="mod-view">
        <div class="mod-form">
          <h2>${mod.icon} ${mod.name}</h2>
          <span class="muted">${mod.desc}</span>
          <form id="mod-form-el">
            <div class="universal-attachments" id="universal-attachments">
              <div class="ua-header">
                <span class="ua-title">📎 Pièces jointes (optionnel)</span>
                <span class="ua-help" title="Ajoute des fichiers ou dossiers que l'IA lira en contexte. PDF, MD, TXT, CSV, JSON pris en charge. Total : 12 fichiers max, ~30 000 caractères lus.">ⓘ</span>
              </div>
              <div class="ua-actions">
                <button type="button" class="btn btn-sm" id="ua-pick-files">📄 Ajouter des fichiers</button>
                <button type="button" class="btn btn-sm" id="ua-pick-folder">📁 Ajouter un dossier</button>
                <button type="button" class="btn btn-sm" id="ua-preview" style="display:none">👁 Aperçu</button>
                <button type="button" class="btn btn-sm" id="ua-clear" style="display:none">Tout retirer</button>
              </div>
              <div class="ua-list" id="ua-list"></div>
            </div>
            ${fields.map(renderField).join('')}
            <details class="advanced-controls">
              <summary>⚙️ Options avancées (ton, longueur, audience…)</summary>
              <div class="field">
                <label>Ton</label>
                <select name="tone">
                  <option value="">Par défaut (profil)</option>
                  <option value="professionnel">Professionnel</option>
                  <option value="amical">Amical</option>
                  <option value="direct">Direct, sans détour</option>
                  <option value="inspirant">Inspirant</option>
                  <option value="pédagogique">Pédagogique</option>
                  <option value="formel">Formel / institutionnel</option>
                  <option value="provocateur">Provocateur</option>
                </select>
              </div>
              <div class="field">
                <label>Longueur</label>
                <select name="length">
                  <option value="">Standard</option>
                  <option value="court">Court (essentiel uniquement)</option>
                  <option value="long">Long (détaillé)</option>
                  <option value="exhaustif">Exhaustif (couvre tout)</option>
                </select>
              </div>
              <div class="field">
                <label>Audience finale</label>
                <select name="audienceLevel">
                  <option value="">Audience par défaut du profil</option>
                  <option value="grand_public">Grand public</option>
                  <option value="specialiste">Spécialiste / pair</option>
                  <option value="decideur">Décideur / dirigeant</option>
                  <option value="investisseur">Investisseur / banquier</option>
                  <option value="client">Client / prospect</option>
                </select>
              </div>
              <div class="field">
                <label>Tier IA</label>
                <select name="tier">
                  <option value="haiku">Haiku — rapide & économique</option>
                  <option value="sonnet" selected>Sonnet — équilibré (recommandé)</option>
                  <option value="opus">Opus — puissant (lent + cher)</option>
                </select>
              </div>
            </details>
            <button type="submit" class="btn btn-primary" style="width:100%">Générer</button>
          </form>
          <div class="mod-history" id="mod-history"></div>
        </div>
        <div class="mod-output">
          <div class="output-toolbar">
            <span class="muted" id="out-meta">—</span>
            <div class="actions">
              <button class="btn btn-sm" id="out-copy" disabled>Copier</button>
              <button class="btn btn-sm" id="out-pdf" disabled>Export PDF</button>
              <button class="btn btn-sm" id="out-docx" disabled>Export DOCX</button>
              <button class="btn btn-sm" id="out-ics" style="display:none">Export iCal</button>
              <button class="btn btn-sm" id="out-csv" style="display:none">Export CSV</button>
              <button class="btn btn-sm" id="out-email" disabled style="display:none">Envoyer par email</button>
            </div>
          </div>
          <div class="output-body" id="out-body">
            <div class="output-empty">Remplissez le formulaire et cliquez sur "Générer".</div>
          </div>
          <div class="refine-bar" id="refine-bar" style="display:none">
            <input type="text" id="refine-input" placeholder="Affiner ce document (ex: « raccourcis l'exec summary », « ajoute une section risques »)" />
            <button class="btn btn-primary btn-sm" id="refine-btn">Affiner</button>
          </div>
        </div>
      </div>`;

    // Restaure le brouillon de formulaire (auto-save)
    restoreFormDraft(moduleId);
    document.getElementById('mod-form-el').addEventListener('input', () => saveFormDraft(moduleId));

    // ---- Pièces jointes universelles + mémorisation par module ----
    const ATTACH_KEY = `eos.attach.${moduleId}`;
    let attachments = [];
    try {
      const saved = JSON.parse(localStorage.getItem(ATTACH_KEY) || '[]');
      if (Array.isArray(saved)) attachments = saved;
    } catch {}

    const persistAttachments = () => {
      try { localStorage.setItem(ATTACH_KEY, JSON.stringify(attachments)); } catch {}
    };

    const renderAttachments = () => {
      const list = document.getElementById('ua-list');
      const previewBtn = document.getElementById('ua-preview');
      const clearBtn = document.getElementById('ua-clear');
      if (!list) return;
      if (previewBtn) previewBtn.style.display = attachments.length ? '' : 'none';
      if (clearBtn) clearBtn.style.display = attachments.length ? '' : 'none';
      if (!attachments.length) { list.innerHTML = ''; return; }
      list.innerHTML = attachments.map((a, i) => {
        const ico = a.type === 'folder' ? '📁' : '📄';
        const name = a.path.split('/').pop();
        const meta = a.type === 'folder' ? 'dossier' : (a.path.split('.').pop().toUpperCase());
        return `<div class="ua-chip">
          <span>${ico}</span>
          <span class="ua-chip-name" title="${a.path}">${name}</span>
          <span class="ua-chip-meta">${meta}</span>
          <button type="button" class="ua-chip-x" data-idx="${i}">×</button>
        </div>`;
      }).join('');
      list.querySelectorAll('.ua-chip-x').forEach((b) => {
        b.addEventListener('click', () => {
          attachments.splice(parseInt(b.dataset.idx, 10), 1);
          persistAttachments();
          renderAttachments();
        });
      });
    };
    document.getElementById('ua-pick-files').addEventListener('click', async () => {
      try {
        const r = await window.eos.pickFiles();
        if (!r || r.canceled) return;
        for (const p of r.filePaths) attachments.push({ type: 'file', path: p });
        persistAttachments();
        renderAttachments();
      } catch (e) { toast(e.message, 'error'); }
    });
    document.getElementById('ua-pick-folder').addEventListener('click', async () => {
      try {
        const r = await window.eos.pickFolder({ title: 'Choisir un dossier en pièce jointe' });
        if (!r || r.canceled) return;
        attachments.push({ type: 'folder', path: r.folderPath });
        persistAttachments();
        renderAttachments();
      } catch (e) { toast(e.message, 'error'); }
    });
    document.getElementById('ua-clear').addEventListener('click', () => {
      attachments = [];
      persistAttachments();
      renderAttachments();
    });
    document.getElementById('ua-preview').addEventListener('click', async () => {
      try { openAttachmentsPreview(attachments); }
      catch (e) { toast(e.message, 'error'); }
    });
    // Expose pour la collecte au submit
    window.__currentAttachments = () => attachments;
    renderAttachments();

    refreshHistory(moduleId);
    if (openDocId) {
      const doc = (await window.eos.listDocs(moduleId)).find((d) => d.id === openDocId);
      if (doc) showOutput(doc, moduleId);
    }

    const audioBtn = document.getElementById('audio-picker-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', async () => {
        const status = document.getElementById('audio-picker-status');
        try {
          const r = await window.eos.pickAudio();
          if (!r || r.canceled) return;
          status.textContent = '⏳ Transcription en cours via Whisper… (peut prendre 30-90s)';
          status.style.color = 'var(--yellow)';
          const out = await window.eos.transcribeAudio(r.filePath);
          if (out && out.ok && out.text) {
            const ta = document.querySelector('textarea[name="transcript"]');
            if (ta) {
              ta.value = out.text;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
            status.textContent = `✓ Transcription terminée (${out.text.length} caractères)`;
            status.style.color = 'var(--green)';
          } else {
            status.textContent = '⚠ Transcription vide';
            status.style.color = 'var(--red)';
          }
        } catch (e) {
          status.textContent = '✗ ' + e.message;
          status.style.color = 'var(--red)';
        }
      });
    }

    const folderBtn = document.getElementById('folder-picker-btn');
    if (folderBtn) {
      folderBtn.addEventListener('click', async () => {
        try {
          const r = await window.eos.pickFolder({ title: 'Choisir le dossier à analyser' });
          if (r && !r.canceled && r.folderPath) {
            document.getElementById('folder-picker-path').value = r.folderPath;
            document.getElementById('folder-picker-name').textContent = '✓ ' + r.folderPath;
            document.getElementById('folder-picker-name').style.color = 'var(--green)';
          }
        } catch (e) { toast(e.message, 'error'); }
      });
    }

    document.querySelectorAll('.pdf-picker-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const slot = btn.dataset.pdfSlot;
          const r = await window.eos.pickPdf();
          if (r && !r.canceled && r.filePath) {
            const hidden = document.querySelector(`input[data-pdf-path="${slot}"]`);
            const label = document.querySelector(`[data-pdf-name="${slot}"]`);
            if (hidden) hidden.value = r.filePath;
            if (label) {
              label.textContent = '✓ ' + r.filePath.split('/').pop();
              label.style.color = 'var(--green)';
            }
          }
        } catch (e) { toast(e.message, 'error'); }
      });
    });

    document.getElementById('mod-form-el').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const input = {}; let tier = 'sonnet';
      const reservedKeys = ['tier', 'tone', 'length', 'audienceLevel'];
      const styleOpts = {};
      for (const [k, v] of fd.entries()) {
        if (k === 'tier') tier = v;
        else if (reservedKeys.includes(k)) { if (v) styleOpts[k] = v; }
        else input[k] = v;
      }
      // styleOpts est passé via options (cf. runGeneration)
      input.__styleOpts = styleOpts;
      // Pièces jointes universelles
      const atts = (typeof window.__currentAttachments === 'function') ? window.__currentAttachments() : [];
      if (atts && atts.length) input.__attachments = atts.slice();
      if (moduleId === 'pdf-analyzer' && !input.filePath) {
        toast('Veuillez choisir un PDF avant de lancer l\'analyse.', 'error');
        return;
      }
      if (moduleId === 'pdf-compare' && (!input.filePathA || !input.filePathB)) {
        toast('Veuillez choisir les deux PDF (A et B) avant de comparer.', 'error');
        return;
      }
      await runGeneration(moduleId, input, tier);
    });
  }

  function renderField(f) {
    if (f.type === 'select') {
      return `<div class="field"><label>${f.label}</label><select name="${f.name}">
        ${f.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select></div>`;
    }
    if (f.type === 'textarea') {
      const ph = f.placeholder ? ` placeholder="${f.placeholder.replace(/"/g, '&quot;')}"` : '';
      return `<div class="field"><label>${f.label}</label><textarea name="${f.name}" rows="${f.rows || 3}"${ph}></textarea></div>`;
    }
    if (f.type === 'pdf-picker') {
      const slot = f.slot || 'X';
      return `<div class="field">
        <label>${f.label}</label>
        <input type="hidden" name="${f.name}" data-pdf-path="${slot}" />
        <button type="button" class="btn pdf-picker-btn" data-pdf-slot="${slot}" style="width:100%">📎 Choisir un PDF…</button>
        <div class="muted pdf-picker-name" data-pdf-name="${slot}" style="margin-top:6px;font-size:12px">Aucun fichier sélectionné</div>
      </div>`;
    }
    if (f.type === 'folder-picker') {
      return `<div class="field">
        <label>${f.label}</label>
        <input type="hidden" name="${f.name}" id="folder-picker-path" />
        <button type="button" class="btn" id="folder-picker-btn" style="width:100%">📁 Choisir un dossier…</button>
        <div class="muted" id="folder-picker-name" style="margin-top:6px;font-size:12px">Dossier de travail du profil sera utilisé</div>
      </div>`;
    }
    if (f.type === 'audio-picker') {
      return `<div class="field">
        <label>${f.label}</label>
        <button type="button" class="btn" id="audio-picker-btn" style="width:100%">🎙 Choisir un fichier audio à transcrire…</button>
        <div class="muted" id="audio-picker-status" style="margin-top:6px;font-size:12px">Aucun fichier sélectionné</div>
      </div>`;
    }
    return `<div class="field"><label>${f.label}</label><input type="${f.type || 'text'}" name="${f.name}" /></div>`;
  }

  async function runGeneration(moduleId, input, tier) {
    const body = document.getElementById('out-body');
    const meta = document.getElementById('out-meta');
    body.innerHTML = `<div class="streaming-output"><pre class="streaming-text" id="stream-text"></pre><div class="streaming-indicator"><div class="spinner"></div><span>Génération en cours…</span></div></div>`;
    meta.textContent = 'Génération en cours…';
    let liveText = '';
    const styleOpts = input.__styleOpts || {};
    delete input.__styleOpts;
    try {
      const r = await window.eos.generateStream(moduleId, input, { tier, style: styleOpts }, (delta, full) => {
        liveText = full;
        const el = document.getElementById('stream-text');
        if (el) {
          el.textContent = liveText;
          body.scrollTop = body.scrollHeight;
        }
      });
      showOutput(r, moduleId);
      refreshHistory(moduleId);
      try { localStorage.removeItem(FORM_DRAFT_KEY(moduleId)); } catch {}
      toast('Document généré', 'success');
    } catch (e) {
      // Affiche le texte partiel reçu si on a streamé avant l'erreur
      if (liveText) {
        body.innerHTML = renderMarkdown(liveText) + `<div class="muted" style="color:var(--red);margin-top:12px">⚠ Génération interrompue : ${e.message}</div>`;
      } else {
        body.innerHTML = `<div class="output-empty" style="color:var(--red)">${e.message}</div>`;
      }
      meta.textContent = 'Erreur';
      toast(e.message, 'error');
    }
  }

  function showOutput(doc, moduleId) {
    currentDoc = { ...doc, moduleId };
    const body = document.getElementById('out-body');
    const meta = document.getElementById('out-meta');
    const refineBar = document.getElementById('refine-bar');
    body.innerHTML = renderMarkdown(doc.content || '');
    const histLen = (doc.history || []).length;
    meta.textContent = `${doc.id} · ${formatDate(doc.createdAt)}` +
      (histLen ? ` · ${histLen} révision${histLen > 1 ? 's' : ''}` : '');

    const copy = document.getElementById('out-copy');
    const pdf  = document.getElementById('out-pdf');
    const docx = document.getElementById('out-docx');
    copy.disabled = false; pdf.disabled = false; docx.disabled = false;
    copy.onclick = () => { navigator.clipboard.writeText(doc.content || ''); toast('Copié', 'success'); };
    pdf.onclick = async () => {
      try {
        if (doc.pdfPath) { await window.eos.revealInFolder(doc.pdfPath); return; }
        const p = await window.eos.exportPDF(doc.content || '', `${moduleId}_${doc.id}`);
        await window.eos.revealInFolder(p);
        toast('PDF exporté', 'success');
      } catch (e) { toast(e.message, 'error'); }
    };
    docx.onclick = async () => {
      try {
        const p = await window.eos.exportDOCX(doc.content || '', `${moduleId}_${doc.id}`);
        await window.eos.revealInFolder(p);
        toast('DOCX exporté', 'success');
      } catch (e) { toast(e.message, 'error'); }
    };

    // Export iCal pour content-plan
    const ics = document.getElementById('out-ics');
    if (ics) {
      if (moduleId === 'content-plan' && doc.ics) {
        ics.style.display = '';
        ics.onclick = async () => {
          try {
            const p = await window.eos.exportICS(moduleId, doc.id);
            await window.eos.revealInFolder(p);
            toast('Calendrier exporté (.ics)', 'success');
          } catch (e) { toast(e.message, 'error'); }
        };
      } else { ics.style.display = 'none'; }
    }
    // Export CSV pour invoice (et fallback générique)
    const csv = document.getElementById('out-csv');
    if (csv) {
      if (moduleId === 'invoice') {
        csv.style.display = '';
        csv.onclick = async () => {
          try {
            const p = await window.eos.exportCSV(moduleId, doc.id);
            await window.eos.revealInFolder(p);
            toast('CSV exporté', 'success');
          } catch (e) { toast(e.message, 'error'); }
        };
      } else { csv.style.display = 'none'; }
    }

    // Bouton "Envoyer par email" — visible uniquement pour modules pertinents
    const emailBtn = document.getElementById('out-email');
    const EMAIL_MODULES = ['cold-email', 'email-campaign', 'proposal', 'invoice'];
    if (emailBtn) {
      if (EMAIL_MODULES.includes(moduleId)) {
        emailBtn.style.display = '';
        emailBtn.disabled = false;
        emailBtn.onclick = () => openEmailDialog(doc, moduleId);
      } else {
        emailBtn.style.display = 'none';
      }
    }

    if (refineBar) refineBar.style.display = '';
    const refineInput = document.getElementById('refine-input');
    const refineBtn   = document.getElementById('refine-btn');
    const submitRefine = async () => {
      const inst = (refineInput.value || '').trim();
      if (!inst) { toast('Décris ce que tu veux modifier', 'error'); return; }
      refineBtn.disabled = true;
      meta.textContent = 'Affinage en cours…';
      body.innerHTML = `<div class="streaming-output"><pre class="streaming-text" id="stream-text"></pre><div class="streaming-indicator"><div class="spinner"></div><span>Affinage en cours…</span></div></div>`;
      let live = '';
      try {
        const r = await window.eos.refineStream(moduleId, doc.id, inst, { tier: 'sonnet' }, (_d, full) => {
          live = full;
          const el = document.getElementById('stream-text');
          if (el) { el.textContent = live; body.scrollTop = body.scrollHeight; }
        });
        refineInput.value = '';
        showOutput(r, moduleId);
        refreshHistory(moduleId);
        toast('Document affiné', 'success');
      } catch (e) {
        if (live) body.innerHTML = renderMarkdown(live) + `<div class="muted" style="color:var(--red);margin-top:12px">⚠ ${e.message}</div>`;
        else body.innerHTML = `<div class="output-empty" style="color:var(--red)">${e.message}</div>`;
        toast(e.message, 'error');
      } finally {
        refineBtn.disabled = false;
      }
    };
    refineBtn.onclick = submitRefine;
    refineInput.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitRefine(); };
  }

  // ---- Form auto-save ----
  function saveFormDraft(moduleId) {
    try {
      const form = document.getElementById('mod-form-el');
      if (!form) return;
      const data = {};
      for (const [k, v] of new FormData(form).entries()) data[k] = v;
      localStorage.setItem(FORM_DRAFT_KEY(moduleId), JSON.stringify(data));
    } catch {}
  }
  function restoreFormDraft(moduleId) {
    try {
      const raw = localStorage.getItem(FORM_DRAFT_KEY(moduleId));
      if (!raw) return;
      const data = JSON.parse(raw);
      const form = document.getElementById('mod-form-el');
      if (!form) return;
      for (const [k, v] of Object.entries(data)) {
        const el = form.querySelector(`[name="${k}"]`);
        if (el && v) {
          el.value = v;
          if (el.dataset.pdfPath && v) {
            const label = form.querySelector(`[data-pdf-name="${el.dataset.pdfPath}"]`);
            if (label) {
              label.textContent = '✓ ' + v.split('/').pop();
              label.style.color = 'var(--green)';
            }
          }
        }
      }
    } catch {}
  }

  async function refreshHistory(moduleId) {
    const h = document.getElementById('mod-history');
    if (!h) return;
    try {
      const allItems = await window.eos.listDocs(moduleId);
      h.innerHTML = `
        <h3>Historique <span class="muted" style="font-weight:400;font-size:11px">(${allItems.length})</span></h3>
        ${allItems.length > 3 ? '<input type="text" class="history-search" id="hist-search" placeholder="🔎 Rechercher…" />' : ''}
        <div id="hist-list"></div>`;
      const renderList = (items) => {
        const list = document.getElementById('hist-list');
        if (!list) return;
        list.innerHTML = items.length ? items.slice(0, 30).map((it) => {
          const summary = summaryFor(it);
          return `<div class="history-item" data-id="${it.id}">
            <div class="h-id">${summary}</div>
            <div class="h-date">${formatDate(it.createdAt)}</div>
          </div>`;
        }).join('') : '<div class="muted" style="font-size:11px">Aucun résultat</div>';
        list.querySelectorAll('.history-item').forEach((el) => {
          el.addEventListener('click', async () => {
            const items = await window.eos.listDocs(moduleId);
            const doc = items.find((d) => d.id === el.dataset.id);
            if (doc) showOutput(doc, moduleId);
          });
        });
      };
      renderList(allItems);
      const search = document.getElementById('hist-search');
      if (search) {
        search.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          if (!q) { renderList(allItems); return; }
          const filtered = allItems.filter((it) => {
            const hay = (
              (it.id || '') + ' ' +
              (it.content || '').slice(0, 2000) + ' ' +
              JSON.stringify(it.input || {})
            ).toLowerCase();
            return hay.includes(q);
          });
          renderList(filtered);
        });
      }
    } catch {}
  }

  function summaryFor(item) {
    const inp = item.input || {};
    // Champs descriptifs candidats par module
    const candidates = [inp.idea, inp.clientName, inp.clientNeed, inp.product, inp.targetRole,
                       inp.docType, inp.processName, inp.fileName, inp.fileA];
    const first = candidates.find((c) => c && String(c).trim());
    if (first) return String(first).slice(0, 60);
    // Fallback : début du contenu
    const firstLine = (item.content || '').split('\n').find((l) => l.trim()) || '';
    return firstLine.replace(/^#+\s*/, '').slice(0, 60) || item.id;
  }

  // ----- Helpers -----
  function greetingFor(name) {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    const first = (name || '').split(' ')[0];
    return first ? `${greet}, ${first}` : greet;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Mini-renderer markdown sans dépendance externe
  function renderMarkdown(md) {
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let html = '';
    const lines = md.split('\n');
    let inList = false, inTable = false, tableRows = [];
    const flushTable = () => {
      if (!tableRows.length) return;
      const rows = tableRows.map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
      const head = rows[0]; const body = rows.slice(2);
      html += '<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
      body.forEach((r) => { html += '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'; });
      html += '</tbody></table>';
      tableRows = []; inTable = false;
    };
    const inline = (s) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    for (const line of lines) {
      if (/^\|.*\|/.test(line)) {
        inTable = true; tableRows.push(line); continue;
      } else if (inTable) { flushTable(); }

      if (/^#{1,6}\s/.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        const lvl = line.match(/^#+/)[0].length;
        html += `<h${Math.min(lvl, 4)}>${inline(line.replace(/^#+\s*/, ''))}</h${Math.min(lvl, 4)}>`;
      } else if (/^[-*]\s/.test(line)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${inline(line.replace(/^[-*]\s*/, ''))}</li>`;
      } else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p>${inline(line)}</p>`;
      }
    }
    flushTable();
    if (inList) html += '</ul>';
    return html;
  }

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type || ''}`; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ---- Attachments preview modal ----
  async function openAttachmentsPreview(attachments) {
    const existing = document.getElementById('att-preview-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'att-preview-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal" style="width: min(820px, 92vw); max-height: 88vh;">
        <h3>👁 Aperçu — ce que l'IA verra</h3>
        <p class="muted" style="margin-top:-8px;font-size:12px">Contenu réellement extrait de tes pièces jointes (après troncature). Ce bloc est ajouté en fin du prompt utilisateur.</p>
        <div id="att-preview-loading" class="muted" style="padding:20px 0">⏳ Lecture en cours…</div>
        <pre id="att-preview-content" style="display:none; white-space:pre-wrap; word-wrap:break-word; background:var(--bg-2); border:1px solid var(--border); padding:14px; border-radius:6px; max-height:55vh; overflow:auto; font-size:12px; color:var(--text-1); font-family: monospace;"></pre>
        <div class="modal-actions" style="margin-top:14px;align-items:center;justify-content:space-between">
          <span id="att-preview-meta" class="muted" style="font-size:11px"></span>
          <button class="btn" id="att-preview-close">Fermer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('att-preview-close').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    try {
      const r = await window.eos.previewAttachments(attachments);
      document.getElementById('att-preview-loading').style.display = 'none';
      const pre = document.getElementById('att-preview-content');
      pre.style.display = '';
      pre.textContent = r.text || '(rien à lire — formats non pris en charge ou fichiers vides)';
      document.getElementById('att-preview-meta').textContent = `${r.length} caractères seront ajoutés au prompt`;
    } catch (e) {
      document.getElementById('att-preview-loading').textContent = '✗ ' + e.message;
    }
  }

  // ---- Email send modal ----
  function openEmailDialog(doc, moduleId) {
    const existing = document.getElementById('email-modal');
    if (existing) existing.remove();

    const firstLine = (doc.content || '').split('\n').find((l) => l.trim()) || '';
    const subjectGuess = firstLine.replace(/^#+\s*/, '').slice(0, 100) ||
      ({ 'cold-email': 'Une opportunité pour vous', 'email-campaign': 'Email 1', 'proposal': 'Notre proposition', 'invoice': 'Votre facture' }[moduleId] || 'Document');

    const modal = document.createElement('div');
    modal.id = 'email-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <h3>Envoyer par email</h3>
        <p class="muted" style="margin-top:-8px;font-size:12px">Envoi via Resend. Configurez RESEND_API_KEY et EMAIL_FROM dans Paramètres → Clés API.</p>
        <div class="field"><label>Destinataire(s)</label><input type="text" id="email-to" placeholder="client@exemple.com (séparer par virgules pour plusieurs)" /></div>
        <div class="field"><label>Sujet</label><input type="text" id="email-subject" value="${subjectGuess.replace(/"/g, '&quot;')}" /></div>
        <div class="field"><label>Message</label><textarea id="email-body" rows="10">${(doc.content || '').replace(/[<>&]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</textarea></div>
        ${doc.pdfPath || moduleId === 'invoice' || moduleId === 'proposal' ? '<div class="field"><label><input type="checkbox" id="email-attach-pdf" /> Joindre une version PDF du document</label></div>' : ''}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="email-cancel">Annuler</button>
          <button class="btn btn-primary" id="email-send">Envoyer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById('email-cancel').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('email-send').onclick = async () => {
      const to = (document.getElementById('email-to').value || '').split(',').map((s) => s.trim()).filter(Boolean);
      const subject = document.getElementById('email-subject').value.trim();
      const body = document.getElementById('email-body').value;
      if (!to.length) { toast('Destinataire manquant', 'error'); return; }
      if (!subject) { toast('Sujet manquant', 'error'); return; }
      const sendBtn = document.getElementById('email-send');
      sendBtn.disabled = true; sendBtn.textContent = 'Envoi…';

      const attachments = [];
      const attachCheck = document.getElementById('email-attach-pdf');
      try {
        if (attachCheck && attachCheck.checked) {
          const path = doc.pdfPath || await window.eos.exportPDF(body, `${moduleId}_${doc.id}`);
          attachments.push({ path, filename: `${moduleId}_${doc.id}.pdf` });
        }
        const html = body
          .replace(/[<>&]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))
          .replace(/\n\n+/g, '</p><p>')
          .replace(/\n/g, '<br>');
        await window.eos.sendEmail({ to, subject, html: `<div style="font-family:system-ui,sans-serif;line-height:1.6"><p>${html}</p></div>`, text: body, attachments });
        toast('Email envoyé', 'success');
        modal.remove();
      } catch (e) {
        sendBtn.disabled = false; sendBtn.textContent = 'Envoyer';
        toast(e.message, 'error');
      }
    };
  }

  return { renderDashboard, renderModule, getModules, getModule, toast };
})();
