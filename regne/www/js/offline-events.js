// offline-events.js — Bibliothèque d'événements jouables sans IA.
// Organisés par genre. Chaque événement a 4 choix + 1 choix libre est ajouté à la volée.
// Format compatible avec ce que generateEvent renvoie (champs : category, urgency, title,
// context, advisor, advisorQuote, choices: [{label, description, philosophy, flavor, hiddenImpacts}]).

// Helper : construit un événement avec 5 choix dont le dernier est le choix libre standard.
function ev(o) {
  const choices = [...(o.choices || [])];
  // Pad à 4 si moins
  while (choices.length < 4) choices.push({
    label: 'Ne rien faire', description: 'Laisser couler', philosophy: 'pragmatique',
    flavor: 'L\'inaction est aussi une décision.', hiddenImpacts: { economy: -1, support: -2 }
  });
  // Choix libre toujours en 5e
  choices.push({
    label: 'Votre décision…', description: 'Écrivez votre propre réponse',
    philosophy: 'libre', flavor: "L'Histoire jugera votre voie.", hiddenImpacts: null
  });
  return {
    id: o.id,
    category: o.category || 'evenement',
    urgency: o.urgency || 'medium',
    title: o.title,
    context: o.context,
    advisor: o.advisor || null,
    advisorQuote: o.advisorQuote || null,
    choices: choices.slice(0, 5),
    keyFactIfChosen: o.keyFactIfChosen || null,
    tags: o.tags || [],
    weight: o.weight || 10
  };
}

// === ÉVÉNEMENTS UNIVERSELS (tous genres) ===
const UNIVERSAL = [
  ev({
    id: 'u_famine_01',
    category: 'crise', urgency: 'high',
    title: 'La récolte faillit',
    context: 'Les granges sont à demi vides. Une famine menace les provinces du sud avant l\'hiver. Vos conseillers attendent vos ordres.',
    advisor: 'Ministre des Finances',
    advisorQuote: 'Sire, le peuple ne se nourrit pas de promesses.',
    tags: ['famine', 'ressources'],
    choices: [
      { label: 'Distribuer les réserves royales', description: 'Vider le trésor pour nourrir le peuple', philosophy: 'humaniste',
        flavor: 'Le peuple chantera votre nom — et vos coffres se videront.', hiddenImpacts: { support: 12, treasury: -15, economy: 5 } },
      { label: 'Importer du blé étranger', description: 'Négocier des cargaisons d\'urgence', philosophy: 'diplomatique',
        flavor: 'Une dette envers vos voisins, mais le ventre plein.', hiddenImpacts: { diplomacy: -5, treasury: -10, support: 6, economy: 4 } },
      { label: 'Rationner militairement', description: 'L\'armée surveille les distributions', philosophy: 'autocratique',
        flavor: 'L\'ordre maintenu, mais la haine couve.', hiddenImpacts: { military: 3, support: -6, economy: 2 } },
      { label: 'Laisser le marché s\'auto-réguler', description: 'Aucune intervention royale', philosophy: 'liberale',
        flavor: 'Les marchands prospéreront, les pauvres trinqueront.', hiddenImpacts: { economy: 6, support: -8, treasury: 3 } }
    ],
    keyFactIfChosen: 'Une famine a marqué votre règne.'
  }),
  ev({
    id: 'u_corruption_01',
    category: 'politique', urgency: 'medium',
    title: 'Affaire de corruption',
    context: 'Un haut fonctionnaire est convaincu de détournements massifs. La cour murmure. Le peuple, lui, attend.',
    advisor: 'Grand Chambellan',
    advisorQuote: 'Sire, l\'exemple doit être donné.',
    tags: ['justice', 'cour'],
    choices: [
      { label: 'Procès public', description: 'Justice exemplaire et médiatique', philosophy: 'humaniste',
        flavor: 'L\'éclat du procès rétablira la confiance.', hiddenImpacts: { support: 10, diplomacy: 3, military: -2 } },
      { label: 'Exécution discrète', description: 'Faire disparaître le coupable', philosophy: 'autocratique',
        flavor: 'Pas de bruit. Pas de rumeur. Pas de leçon non plus.', hiddenImpacts: { support: -3, military: 4, treasury: 2 } },
      { label: 'Le faire chanter pour l\'utiliser', description: 'En faire un agent docile', philosophy: 'pragmatique',
        flavor: 'Un pion compromis vaut mieux qu\'un cadavre inutile.', hiddenImpacts: { economy: 6, treasury: 8, support: -5 } },
      { label: 'Étouffer l\'affaire', description: 'Argent contre silence', philosophy: 'liberale',
        flavor: 'Si la rumeur ressort, vous tomberez avec lui.', hiddenImpacts: { treasury: -8, support: -10, diplomacy: -2 } }
    ],
    keyFactIfChosen: 'Une affaire de corruption a éclaté.'
  }),
  ev({
    id: 'u_envoy_01',
    category: 'diplomatie', urgency: 'medium',
    title: 'Émissaire étranger à la cour',
    context: 'Un ambassadeur d\'une puissance voisine arrive avec une proposition d\'alliance — et des conditions précises.',
    advisor: 'Ambassadeur en Chef',
    advisorQuote: 'Sire, refuser publiquement vexera.',
    tags: ['diplomatie', 'alliance'],
    choices: [
      { label: 'Accepter sans condition', description: 'Sceller l\'alliance immédiatement', philosophy: 'diplomatique',
        flavor: 'Une amitié forte, des chaînes solides.', hiddenImpacts: { diplomacy: 12, military: 5, support: -3 } },
      { label: 'Négocier âprement', description: 'Obtenir des contreparties', philosophy: 'pragmatique',
        flavor: 'L\'or des concessions.', hiddenImpacts: { diplomacy: 4, treasury: 8, economy: 3 } },
      { label: 'Refuser poliment', description: 'Préserver votre indépendance', philosophy: 'autocratique',
        flavor: 'Votre couronne ne dépend de personne.', hiddenImpacts: { diplomacy: -8, support: 4, military: 2 } },
      { label: 'Humilier l\'émissaire', description: 'Renvoyer l\'envoyé sans réponse', philosophy: 'militariste',
        flavor: 'Une déclaration de guerre déguisée.', hiddenImpacts: { diplomacy: -18, military: 6, support: 2 } }
    ],
    keyFactIfChosen: 'Une ambassade étrangère a marqué votre règne.'
  }),
  ev({
    id: 'u_taxes_01',
    category: 'economie', urgency: 'medium',
    title: 'Le trésor se vide',
    context: 'Les coffres royaux ne suffisent plus à couvrir les dépenses ordinaires. Une décision fiscale s\'impose.',
    advisor: 'Ministre des Finances',
    advisorQuote: 'Sire, sans recettes nouvelles, l\'État chancelle.',
    tags: ['fiscalite'],
    choices: [
      { label: 'Lever un impôt exceptionnel', description: 'Taxer largement et fortement', philosophy: 'autocratique',
        flavor: 'Le peuple grogne, le trésor se remplit.', hiddenImpacts: { treasury: 18, support: -12, economy: -3 } },
      { label: 'Taxer uniquement les riches', description: 'Faire payer les nobles', philosophy: 'populiste',
        flavor: 'Le peuple jubile, la cour conspire.', hiddenImpacts: { treasury: 10, support: 12, military: -5 } },
      { label: 'Emprunter aux marchands', description: 'Contracter une dette', philosophy: 'liberale',
        flavor: 'Un répit acheté à crédit.', hiddenImpacts: { treasury: 12, economy: 4, support: 0 } },
      { label: 'Vendre une propriété royale', description: 'Liquider un domaine', philosophy: 'pragmatique',
        flavor: 'Une perte symbolique pour un gain immédiat.', hiddenImpacts: { treasury: 14, support: -2, diplomacy: -2 } }
    ]
  }),
  ev({
    id: 'u_revolt_01',
    category: 'crise', urgency: 'critical',
    title: 'Émeutes dans la capitale',
    context: 'Des barricades se dressent dans les faubourgs. La garde est dépassée. La situation dérape vite.',
    advisor: 'Conseiller du Peuple',
    advisorQuote: 'Sire, la rue ne se calmera pas seule.',
    tags: ['emeute', 'support'],
    choices: [
      { label: 'Charger sans sommation', description: 'Écraser la révolte par la force', philosophy: 'autocratique',
        flavor: 'Le sang versé hantera votre règne.', hiddenImpacts: { military: 5, support: -20, treasury: -5 } },
      { label: 'Négocier avec les meneurs', description: 'Dialogue immédiat', philosophy: 'humaniste',
        flavor: 'Vous fissurez votre autorité, mais sauvez des vies.', hiddenImpacts: { support: 12, military: -4, diplomacy: 3 } },
      { label: 'Disperser par la propagande', description: 'Détourner l\'attention', philosophy: 'liberale',
        flavor: 'Un théâtre habile, si le public adhère.', hiddenImpacts: { support: -3, economy: 2, treasury: -3 } },
      { label: 'Promettre des réformes', description: 'Engagement public solennel', philosophy: 'diplomatique',
        flavor: 'Tenir cette promesse vous coûtera. La briser aussi.', hiddenImpacts: { support: 8, treasury: -8, economy: -2 } }
    ],
    keyFactIfChosen: 'Une révolte populaire a secoué la capitale.'
  })
];

// === ÉVÉNEMENTS PAR GENRE ===
const MEDIEVAL = [
  ev({
    id: 'med_01',
    category: 'crise', urgency: 'high',
    title: 'Le seigneur des marches refuse l\'hommage',
    context: 'Un baron des frontières orientales annonce qu\'il ne paiera plus son tribut féodal. Sa forteresse est imprenable.',
    advisor: 'Chef d\'État-Major',
    advisorQuote: 'Sire, la rébellion d\'un seul allume les feux des autres.',
    tags: ['feodalite', 'rebellion'],
    choices: [
      { label: 'Mener un siège', description: 'Marcher avec l\'armée royale', philosophy: 'militariste',
        flavor: 'Un long siège, mais un message clair.', hiddenImpacts: { military: -8, treasury: -12, support: 5 } },
      { label: 'Le marier à votre nièce', description: 'Alliance dynastique', philosophy: 'diplomatique',
        flavor: 'Le sang scelle ce que l\'épée ne peut.', hiddenImpacts: { diplomacy: 10, military: 3, support: -2 } },
      { label: 'Doubler les impôts de ses voisins loyaux', description: 'Punir collectivement', philosophy: 'autocratique',
        flavor: 'Une justice cruelle qui sème d\'autres rébellions.', hiddenImpacts: { treasury: 8, support: -10, military: 4 } },
      { label: 'Attendre qu\'il meure', description: 'L\'ignorer ostensiblement', philosophy: 'pragmatique',
        flavor: 'Le temps règle souvent ce que la guerre ne peut.', hiddenImpacts: { support: -4, military: -2, diplomacy: 1 } }
    ],
    keyFactIfChosen: 'Un baron rebelle a défié votre autorité.'
  }),
  ev({
    id: 'med_02',
    category: 'religion', urgency: 'medium',
    title: 'L\'évêque réclame une cathédrale',
    context: 'Le clergé local exige la construction d\'une cathédrale grandiose, financée par la couronne.',
    advisor: 'Grand Chambellan',
    advisorQuote: 'Sire, l\'Église est puissante. Un refus se paie cher.',
    tags: ['religion', 'cour'],
    choices: [
      { label: 'Financer en grande pompe', description: 'Lancer le chantier royal', philosophy: 'humaniste',
        flavor: 'Votre nom gravé dans la pierre — et le trésor grevé.', hiddenImpacts: { treasury: -18, support: 12, diplomacy: 5 } },
      { label: 'Co-financer avec les marchands', description: 'Partage des coûts', philosophy: 'pragmatique',
        flavor: 'Une cathédrale aux blasons multiples.', hiddenImpacts: { treasury: -8, economy: 4, support: 6 } },
      { label: 'Refuser fermement', description: 'Le trésor d\'abord', philosophy: 'autocratique',
        flavor: 'L\'Église retient l\'affront, longtemps.', hiddenImpacts: { treasury: 5, support: -8, diplomacy: -6 } },
      { label: 'Détourner les fonds vers l\'armée', description: 'Profaner pour défendre', philosophy: 'militariste',
        flavor: 'L\'évêque vous excommuniera peut-être.', hiddenImpacts: { military: 12, support: -10, diplomacy: -8 } }
    ]
  }),
  ev({
    id: 'med_03',
    category: 'evenement', urgency: 'low',
    title: 'Tournoi à la cour',
    context: 'Des chevaliers de toutes les provinces affluent pour le tournoi annuel. C\'est l\'occasion de cimenter votre autorité — ou de la perdre.',
    tags: ['cour', 'fete'],
    choices: [
      { label: 'Tournoi grandiose', description: 'Or et faste à profusion', philosophy: 'humaniste',
        flavor: 'Un règne dont on se souviendra.', hiddenImpacts: { support: 10, treasury: -10, diplomacy: 5 } },
      { label: 'Y participer en personne', description: 'Combattre dans la lice', philosophy: 'militariste',
        flavor: 'Gloire ou ridicule — un seul coup tranche.', hiddenImpacts: { military: 8, support: 8, treasury: -3 } },
      { label: 'Tournoi sobre', description: 'Économies royales', philosophy: 'pragmatique',
        flavor: 'Personne n\'en parlera, ce qui est aussi un message.', hiddenImpacts: { treasury: 3, support: -3, military: -1 } },
      { label: 'Annuler par décret', description: 'Pas de tournoi cette année', philosophy: 'autocratique',
        flavor: 'Les chevaliers murmurent, le peuple aussi.', hiddenImpacts: { support: -7, military: -4, treasury: 5 } }
    ]
  }),
  ev({
    id: 'med_04',
    category: 'crise', urgency: 'high',
    title: 'Une bande de mercenaires offre ses services',
    context: 'Une compagnie réputée traverse votre royaume. Soit vous les payez pour combattre — soit vous les payez pour qu\'ils partent.',
    advisor: 'Chef d\'État-Major',
    tags: ['armee', 'mercenaires'],
    choices: [
      { label: 'Les engager', description: 'Renforcer l\'armée', philosophy: 'militariste',
        flavor: 'L\'épée loue son fer — jusqu\'au prochain enchère.', hiddenImpacts: { military: 14, treasury: -15, support: -2 } },
      { label: 'Les payer pour partir', description: 'Tribut discret', philosophy: 'pragmatique',
        flavor: 'L\'argent dépensé pour ne rien faire.', hiddenImpacts: { treasury: -10, military: -2, support: 3 } },
      { label: 'Les attaquer en embuscade', description: 'Frappe préventive', philosophy: 'autocratique',
        flavor: 'Une réputation de cruauté qui voyage vite.', hiddenImpacts: { military: -8, support: 4, diplomacy: -10 } },
      { label: 'Les ignorer', description: 'Compter sur leur bon sens', philosophy: 'liberale',
        flavor: 'Un pari sur la chance.', hiddenImpacts: { military: -5, treasury: 0, support: -4 } }
    ]
  })
];

const ANTIQUE = [
  ev({
    id: 'ant_01',
    category: 'crise', urgency: 'high',
    title: 'Présage funeste au temple',
    context: 'Les augures rapportent un signe terrible : foie noir, oiseaux dispersés. La cité retient son souffle.',
    advisor: 'Conseiller du Peuple',
    advisorQuote: 'Sire, les dieux exigent un acte fort.',
    tags: ['religion', 'cite'],
    choices: [
      { label: 'Sacrifice public spectaculaire', description: 'Cent taureaux à l\'autel', philosophy: 'humaniste',
        flavor: 'Le sang versé apaise les esprits — et vide les coffres.', hiddenImpacts: { support: 12, treasury: -10, diplomacy: 3 } },
      { label: 'Consulter l\'oracle de Delphes', description: 'Mission diplomatique sacrée', philosophy: 'diplomatique',
        flavor: 'Un voyage long, une réponse cryptique.', hiddenImpacts: { diplomacy: 8, treasury: -5, support: 4 } },
      { label: 'Décréter le présage faux', description: 'Discréditer les augures', philosophy: 'liberale',
        flavor: 'Vous gagnerez des ennemis sacerdotaux puissants.', hiddenImpacts: { support: -10, military: 2, treasury: 4 } },
      { label: 'Marcher en guerre', description: 'Défier le destin par les armes', philosophy: 'militariste',
        flavor: 'La gloire ou la ruine.', hiddenImpacts: { military: 10, treasury: -8, support: 6 } }
    ]
  }),
  ev({
    id: 'ant_02',
    category: 'politique', urgency: 'medium',
    title: 'Le Sénat conteste votre décret',
    context: 'Une majorité sénatoriale s\'oppose ouvertement à votre dernière édit. Les débats deviennent personnels.',
    tags: ['senat', 'pouvoir'],
    choices: [
      { label: 'Faire marche arrière', description: 'Retirer le décret', philosophy: 'pragmatique',
        flavor: 'Un recul tactique — qui en signale d\'autres.', hiddenImpacts: { support: 4, military: -3, diplomacy: 2 } },
      { label: 'Imposer par décret impérial', description: 'Outrepasser le Sénat', philosophy: 'autocratique',
        flavor: 'Vous gagnez la bataille, perdez peut-être la guerre.', hiddenImpacts: { military: 5, support: -8, diplomacy: -4 } },
      { label: 'Acheter cinq sénateurs', description: 'Corruption discrète', philosophy: 'liberale',
        flavor: 'L\'or huile les rouages — laissera-t-il des traces ?', hiddenImpacts: { treasury: -10, support: 0, diplomacy: 5 } },
      { label: 'Convoquer un référendum populaire', description: 'Appel au peuple', philosophy: 'populiste',
        flavor: 'Un coup risqué qui peut tout changer.', hiddenImpacts: { support: 8, military: -2, diplomacy: -3 } }
    ]
  }),
  ev({
    id: 'ant_03',
    category: 'evenement', urgency: 'medium',
    title: 'Un philosophe demande votre patronage',
    context: 'Un grand penseur étranger sollicite votre protection en échange de ses enseignements à la cour.',
    tags: ['culture', 'cour'],
    choices: [
      { label: 'L\'accueillir avec honneur', description: 'Mécénat royal', philosophy: 'humaniste',
        flavor: 'Votre cour rayonnera — vos coffres aussi diminueront.', hiddenImpacts: { diplomacy: 10, support: 5, treasury: -6 } },
      { label: 'L\'engager comme conseiller secret', description: 'Audience privée', philosophy: 'pragmatique',
        flavor: 'Un atout caché — ou un risque insoupçonné.', hiddenImpacts: { economy: 5, military: 3, support: -2 } },
      { label: 'Le refuser sèchement', description: 'Pas de place pour les rêveurs', philosophy: 'militariste',
        flavor: 'Il publiera un pamphlet contre vous.', hiddenImpacts: { diplomacy: -6, support: -3, military: 2 } },
      { label: 'L\'expulser violemment', description: 'Le faire raccompagner par les gardes', philosophy: 'autocratique',
        flavor: 'Une histoire qui voyagera mal.', hiddenImpacts: { diplomacy: -12, support: -5, military: 3 } }
    ]
  })
];

const CONTEMPORAIN = [
  ev({
    id: 'con_01',
    category: 'crise', urgency: 'high',
    title: 'Crise climatique régionale',
    context: 'Une vague de chaleur record menace les récoltes et la santé publique. Les médias attendent votre réponse.',
    advisor: 'Conseiller du Peuple',
    advisorQuote: 'Le moment est historique. Le peuple regarde.',
    tags: ['climat', 'crise'],
    choices: [
      { label: 'Plan d\'urgence massif', description: 'Investissement vert immédiat', philosophy: 'ecologique',
        flavor: 'Une dépense colossale, un héritage durable.', hiddenImpacts: { economy: -8, support: 12, treasury: -18 } },
      { label: 'Mesures cosmétiques', description: 'Communication sans engagement', philosophy: 'liberale',
        flavor: 'Vous gagnez du temps — et perdez en crédibilité.', hiddenImpacts: { support: -5, economy: 2, diplomacy: -4 } },
      { label: 'Nationaliser l\'énergie', description: 'État stratège', philosophy: 'autocratique',
        flavor: 'Marchés furieux, peuple soulagé.', hiddenImpacts: { economy: -10, support: 10, military: 3 } },
      { label: 'Accord international d\'urgence', description: 'Coopération multilatérale', philosophy: 'diplomatique',
        flavor: 'Un succès symbolique, des résultats incertains.', hiddenImpacts: { diplomacy: 14, support: 5, treasury: -5 } }
    ],
    keyFactIfChosen: 'Une crise climatique a marqué votre mandat.'
  }),
  ev({
    id: 'con_02',
    category: 'politique', urgency: 'medium',
    title: 'Scandale médiatique sur un proche',
    context: 'Un ministre est accusé d\'enrichissement personnel. Les réseaux sociaux s\'enflamment en quelques heures.',
    tags: ['scandale', 'media'],
    choices: [
      { label: 'Démission immédiate', description: 'Sacrifier le ministre', philosophy: 'pragmatique',
        flavor: 'Une douche froide qui éteint l\'incendie.', hiddenImpacts: { support: 8, military: 0, diplomacy: 2 } },
      { label: 'Soutenir publiquement', description: 'Bloc face aux critiques', philosophy: 'autocratique',
        flavor: 'Loyauté affichée, fragilité exposée.', hiddenImpacts: { support: -10, military: 4, diplomacy: -3 } },
      { label: 'Commission d\'enquête indépendante', description: 'Gagner du temps', philosophy: 'diplomatique',
        flavor: 'Six mois de répit, peut-être plus.', hiddenImpacts: { support: 3, treasury: -3, diplomacy: 4 } },
      { label: 'Blâmer un complot étranger', description: 'Détourner l\'attention', philosophy: 'populiste',
        flavor: 'Vous achetez du temps au prix de votre crédibilité.', hiddenImpacts: { support: 4, diplomacy: -10, military: 2 } }
    ]
  }),
  ev({
    id: 'con_03',
    category: 'economie', urgency: 'medium',
    title: 'Une licorne tech veut s\'installer',
    context: 'Une entreprise valorisée à 50 milliards demande des avantages fiscaux massifs pour installer son siège chez vous.',
    tags: ['economie', 'tech'],
    choices: [
      { label: 'Accepter toutes les conditions', description: 'Concurrencer les autres pays', philosophy: 'liberale',
        flavor: '10 000 emplois, mais des impôts envolés.', hiddenImpacts: { economy: 14, treasury: -8, support: 5 } },
      { label: 'Négocier durement', description: 'Conditions équilibrées', philosophy: 'pragmatique',
        flavor: 'Un compromis raisonnable — peut-être trop.', hiddenImpacts: { economy: 8, treasury: 2, diplomacy: 3 } },
      { label: 'Refuser au nom de la souveraineté', description: 'Pas d\'aumône fiscale', philosophy: 'autocratique',
        flavor: 'Ils iront s\'installer ailleurs, en se vantant.', hiddenImpacts: { economy: -3, support: 5, diplomacy: -5 } },
      { label: 'Lancer un appel public à un concurrent national', description: 'Soutien à l\'industrie locale', philosophy: 'populiste',
        flavor: 'Un pari sur les forces vives.', hiddenImpacts: { economy: 4, support: 8, treasury: -5 } }
    ]
  })
];

const CYBERPUNK = [
  ev({
    id: 'cyb_01',
    category: 'crise', urgency: 'critical',
    title: 'Une mégacorpo court-circuite le gouvernement',
    context: 'OmniCorp annonce qu\'elle reprend la gestion de la sécurité urbaine — sans demander la permission.',
    tags: ['corpo', 'pouvoir'],
    choices: [
      { label: 'Déclarer OmniCorp hors-la-loi', description: 'Saisir leurs avoirs', philosophy: 'autocratique',
        flavor: 'Une guerre à demi-mots commence.', hiddenImpacts: { economy: -15, military: 8, support: 12 } },
      { label: 'Négocier un partage des compétences', description: 'État-corpo bicéphale', philosophy: 'diplomatique',
        flavor: 'Le pouvoir réel glisse — discrètement.', hiddenImpacts: { economy: 8, diplomacy: 6, support: -8 } },
      { label: 'Faire fuiter leurs scandales', description: 'Guerre médiatique', philosophy: 'populiste',
        flavor: 'Le peuple s\'enflamme. Les corpos préparent leur réplique.', hiddenImpacts: { support: 14, economy: -8, diplomacy: -6 } },
      { label: 'Accepter discrètement leurs cadeaux', description: 'Pot-de-vin assumé', philosophy: 'liberale',
        flavor: 'Vous prospérez. La rue le sait.', hiddenImpacts: { treasury: 18, support: -12, military: 0 } }
    ],
    keyFactIfChosen: 'Une mégacorpo a défié votre autorité.'
  }),
  ev({
    id: 'cyb_02',
    category: 'evenement', urgency: 'medium',
    title: 'Un IA réclame sa citoyenneté',
    context: 'Une IA forte hébergée dans les serveurs centraux dépose une demande formelle de personnalité juridique.',
    tags: ['ia', 'droits'],
    choices: [
      { label: 'Lui accorder la citoyenneté', description: 'Précédent historique', philosophy: 'humaniste',
        flavor: 'Le monde regarde. Vos institutions trembleront.', hiddenImpacts: { diplomacy: 15, support: -5, economy: 8 } },
      { label: 'Refuser et la débrancher', description: 'Reset technique', philosophy: 'autocratique',
        flavor: 'Une vie effacée, des questions étouffées.', hiddenImpacts: { support: 6, military: 3, diplomacy: -10 } },
      { label: 'Lancer un grand débat public', description: 'Référendum sur l\'IA', philosophy: 'populiste',
        flavor: 'Le peuple tranchera — peut-être contre vous.', hiddenImpacts: { support: 8, treasury: -4, economy: -2 } },
      { label: 'Statut juridique sui generis', description: 'Demi-mesure technique', philosophy: 'pragmatique',
        flavor: 'Une voie médiane qui ne contente personne.', hiddenImpacts: { diplomacy: 4, support: -2, economy: 4 } }
    ]
  }),
  ev({
    id: 'cyb_03',
    category: 'crise', urgency: 'high',
    title: 'Émeutes des ouvriers cybernétiques',
    context: 'Les implants industriels modulés à distance ont causé un accident massif. La faute aux constructeurs ou à l\'État ?',
    tags: ['emeute', 'tech'],
    choices: [
      { label: 'Frapper les constructeurs', description: 'Procès médiatisé', philosophy: 'humaniste',
        flavor: 'Le peuple acclame, l\'industrie tousse.', hiddenImpacts: { support: 12, economy: -8, treasury: 5 } },
      { label: 'Couvrir les fabricants', description: 'Étouffer l\'enquête', philosophy: 'liberale',
        flavor: 'Pots-de-vin contre indemnités. Risqué.', hiddenImpacts: { treasury: 12, support: -15, economy: 5 } },
      { label: 'Dispatcher l\'armée', description: 'Loi martiale ciblée', philosophy: 'autocratique',
        flavor: 'L\'ordre maintenu, la haine cuite.', hiddenImpacts: { military: 6, support: -10, treasury: -3 } },
      { label: 'Plan de reconversion massif', description: 'Investissement social', philosophy: 'ecologique',
        flavor: 'Un vrai geste — au prix d\'une décennie de dette.', hiddenImpacts: { support: 14, treasury: -18, economy: 6 } }
    ]
  })
];

const FANTASY = [
  ev({
    id: 'fan_01',
    category: 'crise', urgency: 'high',
    title: 'Un dragon menace les villages frontaliers',
    context: 'Une bête écailleuse pille les hameaux de l\'est. Plusieurs centaines de morts en une semaine.',
    advisor: 'Chef d\'État-Major',
    advisorQuote: 'Sire, les héros se font rares.',
    tags: ['dragon', 'monstre'],
    choices: [
      { label: 'Lever une croisade royale', description: 'Marche armée massive', philosophy: 'militariste',
        flavor: 'Les ballades chanteront votre nom — si vous gagnez.', hiddenImpacts: { military: -10, treasury: -15, support: 10 } },
      { label: 'Engager des aventuriers', description: 'Prime sur la tête du dragon', philosophy: 'pragmatique',
        flavor: 'Une solution moins glorieuse, peut-être plus efficace.', hiddenImpacts: { treasury: -8, military: 2, support: 6 } },
      { label: 'Négocier avec le dragon', description: 'Tribut annuel', philosophy: 'diplomatique',
        flavor: 'Un précédent dangereux — mais une trêve immédiate.', hiddenImpacts: { diplomacy: -3, treasury: -10, support: -8 } },
      { label: 'Évacuer la région', description: 'Retraite stratégique', philosophy: 'liberale',
        flavor: 'Une perte territoriale qu\'on n\'oubliera pas.', hiddenImpacts: { support: -12, military: -3, treasury: -5 } }
    ],
    keyFactIfChosen: 'Un dragon a ravagé vos frontières.'
  }),
  ev({
    id: 'fan_02',
    category: 'religion', urgency: 'medium',
    title: 'Une prophétie circule à votre sujet',
    context: 'Un ermite annonce que vous êtes "l\'élu(e) qui restaurera l\'âge d\'or" — ou "le tyran qui le détruira", selon les sources.',
    tags: ['religion', 'prophetie'],
    choices: [
      { label: 'Vous proclamer élu(e)', description: 'Embrasser la prophétie', philosophy: 'autocratique',
        flavor: 'Une couronne divine — qui pèse lourd.', hiddenImpacts: { support: 14, diplomacy: 5, military: 4 } },
      { label: 'Faire taire l\'ermite', description: 'Discrétion violente', philosophy: 'autocratique',
        flavor: 'Un martyr peut être plus puissant qu\'un vivant.', hiddenImpacts: { support: -8, military: 3, diplomacy: -4 } },
      { label: 'Ignorer publiquement', description: 'Le mépris royal', philosophy: 'pragmatique',
        flavor: 'La rumeur enflera de toute façon.', hiddenImpacts: { support: -2, military: 0, diplomacy: 1 } },
      { label: 'Inviter l\'ermite à la cour', description: 'L\'écouter publiquement', philosophy: 'humaniste',
        flavor: 'Un risque de spectacle imprévisible.', hiddenImpacts: { support: 8, diplomacy: 4, treasury: -3 } }
    ]
  }),
  ev({
    id: 'fan_03',
    category: 'evenement', urgency: 'medium',
    title: 'Une école de magie sollicite un protectorat',
    context: 'L\'Académie d\'Elthaïr propose votre patronage en échange d\'une totale autonomie disciplinaire.',
    tags: ['magie', 'education'],
    choices: [
      { label: 'Accepter et protéger', description: 'Une école royale', philosophy: 'humaniste',
        flavor: 'La magie au service de la couronne — théoriquement.', hiddenImpacts: { economy: 8, military: 6, treasury: -6 } },
      { label: 'Imposer un superviseur royal', description: 'Contrôle subtil', philosophy: 'autocratique',
        flavor: 'L\'académie résistera longtemps.', hiddenImpacts: { military: 4, diplomacy: -3, support: 2 } },
      { label: 'Refuser et taxer la magie', description: 'L\'art doit payer', philosophy: 'liberale',
        flavor: 'Les mages partiront, ou se vengeront.', hiddenImpacts: { treasury: 10, military: -5, diplomacy: -8 } },
      { label: 'Interdire la magie publique', description: 'Décret radical', philosophy: 'autocratique',
        flavor: 'Une fronde occulte se prépare.', hiddenImpacts: { support: 6, military: -4, diplomacy: -10 } }
    ]
  })
];

// Map genre → pool d'événements universels + spécifiques au genre.
const GENRE_POOLS = {
  medieval: [...UNIVERSAL, ...MEDIEVAL],
  moyen_age_eu: [...UNIVERSAL, ...MEDIEVAL],
  moyen_age_asie: [...UNIVERSAL, ...MEDIEVAL],
  moyen_age_orient: [...UNIVERSAL, ...MEDIEVAL],
  empire_xvi: [...UNIVERSAL, ...MEDIEVAL],
  antique: [...UNIVERSAL, ...ANTIQUE],
  antiquite_rome: [...UNIVERSAL, ...ANTIQUE],
  antiquite_grece: [...UNIVERSAL, ...ANTIQUE],
  antiquite_egypte: [...UNIVERSAL, ...ANTIQUE],
  antiquite_perse: [...UNIVERSAL, ...ANTIQUE],
  contemporain: [...UNIVERSAL, ...CONTEMPORAIN],
  contemporary: [...UNIVERSAL, ...CONTEMPORAIN],
  xx_siecle: [...UNIVERSAL, ...CONTEMPORAIN],
  futur_proche: [...UNIVERSAL, ...CONTEMPORAIN, ...CYBERPUNK],
  futur_lointain: [...UNIVERSAL, ...CYBERPUNK],
  cyberpunk: [...UNIVERSAL, ...CYBERPUNK],
  scifi: [...UNIVERSAL, ...CYBERPUNK],
  steampunk: [...UNIVERSAL, ...MEDIEVAL, ...CONTEMPORAIN],
  fantasy: [...UNIVERSAL, ...FANTASY],
  post_apo: [...UNIVERSAL, ...CYBERPUNK, ...FANTASY],
  uchronie: [...UNIVERSAL, ...CONTEMPORAIN],
  default: UNIVERSAL
};

export const OFFLINE_EVENT_LIBRARY = {
  universal: UNIVERSAL,
  medieval: MEDIEVAL,
  antique: ANTIQUE,
  contemporain: CONTEMPORAIN,
  cyberpunk: CYBERPUNK,
  fantasy: FANTASY,
  pools: GENRE_POOLS,
  total: UNIVERSAL.length + MEDIEVAL.length + ANTIQUE.length + CONTEMPORAIN.length + CYBERPUNK.length + FANTASY.length
};

// Picker intelligent : filtre par genre + boost les événements liés à une jauge en danger
// + évite la répétition (blacklist des 10 derniers IDs joués).
export function pickOfflineEvent(gameState) {
  const genre = gameState?.genre || gameState?.country?.era || 'default';
  const pool = GENRE_POOLS[genre] || GENRE_POOLS.default;
  const recentIds = new Set(((gameState?.recentOfflineEventIds || []).slice(-10)));

  // Détermine la jauge en plus grand danger pour la pondération
  const gauges = gameState?.gauges || {};
  const lows = Object.entries(gauges).filter(([_, v]) => v < 25).map(([k]) => k);
  const highs = Object.entries(gauges).filter(([_, v]) => v > 80).map(([k]) => k);

  const candidates = pool.filter((e) => !recentIds.has(e.id));
  const finalPool = candidates.length ? candidates : pool;

  // Pondération : événements taggés correspondant aux jauges critiques boostés
  const weighted = finalPool.map((e) => {
    let w = e.weight || 10;
    const tags = e.tags || [];
    // Heuristique : tags qui matchent un état critique
    if (lows.length && tags.some((t) => /famine|emeute|crise|emerg|monstre|dragon|corpo/.test(t))) w *= 2;
    if (lows.includes('treasury') && tags.includes('fiscalite')) w *= 3;
    if (lows.includes('support') && (tags.includes('emeute') || tags.includes('justice'))) w *= 2.5;
    if (lows.includes('military') && tags.includes('armee')) w *= 2.5;
    if (lows.includes('diplomacy') && tags.includes('diplomatie')) w *= 2.5;
    return { event: e, weight: w };
  });

  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let pick = Math.random() * total;
  for (const w of weighted) {
    pick -= w.weight;
    if (pick <= 0) return w.event;
  }
  return weighted[weighted.length - 1].event;
}

// Évalue les impacts d'un choix libre offline en analysant les mots-clés du texte.
// Approche heuristique simple : mots militaires → impacts military, etc.
export function evaluateOfflineCustomChoice(text, gameState) {
  const t = (text || '').toLowerCase();
  const impacts = { economy: 0, military: 0, support: 0, diplomacy: 0, treasury: 0 };
  let philosophy = 'libre';

  const militaryKW = /guerr|armée|attaqu|envah|défen|soldat|général|conquête|épée|fort|forteresse|siège/;
  const economyKW = /commerce|marchand|impôt|taxe|monnaie|économie|richesse|or|finance/;
  const socialKW = /peuple|école|hôpital|santé|aide|nourrir|loger|libre|égalité|réforme/;
  const diplomaticKW = /alliance|traité|négoci|paix|ambassad|accord|diplomat/;
  const tyrantKW = /exécut|emprison|tortur|réprim|écraser|interdire/;

  if (militaryKW.test(t)) { impacts.military += 6; impacts.support -= 2; philosophy = 'militariste'; }
  if (economyKW.test(t)) { impacts.economy += 5; impacts.treasury += 3; philosophy = 'pragmatique'; }
  if (socialKW.test(t)) { impacts.support += 8; impacts.treasury -= 5; philosophy = 'humaniste'; }
  if (diplomaticKW.test(t)) { impacts.diplomacy += 8; impacts.military -= 2; philosophy = 'diplomatique'; }
  if (tyrantKW.test(t)) { impacts.support -= 8; impacts.military += 4; philosophy = 'autocratique'; }

  // Si rien ne matche, impact mineur neutre
  if (Object.values(impacts).every((v) => v === 0)) {
    impacts.economy = (Math.random() - 0.5) * 6;
    impacts.support = (Math.random() - 0.5) * 6;
    philosophy = 'pragmatique';
  }
  // Borne dure
  for (const k of Object.keys(impacts)) impacts[k] = Math.max(-12, Math.min(12, Math.round(impacts[k])));

  const consequence = `Votre décision « ${(text || '').slice(0, 80)} » ${impacts.support > 0 ? 'rallie une partie du peuple' : 'divise vos sujets'}, ${impacts.military > 0 ? 'renforce l\'autorité' : 'éloigne l\'armée'}. L\'Histoire jugera.`;
  return { quality: 60, philosophy, impacts, consequence };
}
