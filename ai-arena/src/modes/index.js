import { clashMode } from './clash.js';
import { imposteurMode } from './imposteur.js';
import { forgeMode } from './forge.js';
import { oracleMode } from './oracle.js';
import { interrogatoireMode } from './interrogatoire.js';
import { fusionMode } from './fusion.js';
import { philosopheMode } from './philosophe.js';
import { arenaMode } from './arena.js';
import { libreMode } from './libre.js';
import { jardinMode } from './jardin.js';
import { recetteMode } from './recette.js';
import { voyageMode } from './voyage.js';
import { livreMode } from './livre.js';
import { critiqueMode } from './critique.js';
import { musiqueMode } from './musique.js';
import { sfMode } from './sf.js';
import { donjonMode } from './donjon.js';
import { pitchMode } from './pitch.js';
import { detectiveMode } from './detective.js';
import { roastMode } from './roast.js';
import { avocatMode } from './avocat.js';
import { dragMode } from './drag.js';
import { fakenewsMode } from './fakenews.js';
import { therapyMode } from './therapy.js';
import { trashtalkMode } from './trashtalk.js';
import { souperMode } from './souper.js';
import { badcopMode } from './badcop.js';
import { humournoirMode } from './humournoir.js';

export const MODES = {
  clash: {
    id: 'clash',
    emoji: '⚔️',
    name: 'Clash',
    tagline: 'Deux IA débattent, tu votes',
    difficulty: 'Facile',
    subjectLabel: 'Sujet du débat',
    subjectPlaceholder: 'Ex: Faut-il interdire les réseaux sociaux aux mineurs ?',
    canVote: true,
    build: clashMode
  },
  imposteur: {
    id: 'imposteur',
    emoji: '🕵️',
    name: 'Imposteur',
    tagline: 'Une IA essaie de passer pour humaine',
    difficulty: 'Avancé',
    subjectLabel: 'Contexte de la rencontre',
    subjectPlaceholder: 'Ex: Forum sur la cuisine, app de rencontre...',
    canVote: false,
    build: imposteurMode
  },
  forge: {
    id: 'forge',
    emoji: '✍️',
    name: 'Forge',
    tagline: "Co-écriture d'histoire à deux IA",
    difficulty: 'Facile',
    subjectLabel: 'Titre / pitch',
    subjectPlaceholder: 'Ex: Le dernier train pour Mars (sci-fi)',
    canVote: false,
    build: forgeMode
  },
  oracle: {
    id: 'oracle',
    emoji: '🎯',
    name: 'Oracle',
    tagline: 'Énigmes : une IA pose, l\'autre résout',
    difficulty: 'Intermédiaire',
    subjectLabel: 'Thème des énigmes',
    subjectPlaceholder: 'Ex: Logique, mythologie, mathématiques...',
    canVote: false,
    build: oracleMode
  },
  interrogatoire: {
    id: 'interrogatoire',
    emoji: '🔦',
    name: 'Interrogatoire',
    tagline: 'Suspect vs détective',
    difficulty: 'Intermédiaire',
    subjectLabel: 'Type de crime',
    subjectPlaceholder: 'Ex: Vol de tableau, cambriolage...',
    canVote: false,
    build: interrogatoireMode
  },
  fusion: {
    id: 'fusion',
    emoji: '⚡',
    name: 'Fusion',
    tagline: 'Collaboration créative itérative',
    difficulty: 'Facile',
    subjectLabel: 'Projet à construire',
    subjectPlaceholder: 'Ex: Concept d\'app, slogan, plan de cours...',
    canVote: false,
    build: fusionMode
  },
  philosophe: {
    id: 'philosophe',
    emoji: '🧿',
    name: 'Philosophe',
    tagline: 'Débat sur des questions sans réponse',
    difficulty: 'Avancé',
    subjectLabel: 'Question philosophique',
    subjectPlaceholder: 'Ex: Le libre arbitre existe-t-il ?',
    canVote: true,
    build: philosopheMode
  },
  arena: {
    id: 'arena',
    emoji: '🎭',
    name: 'Arena',
    tagline: 'Roleplay de personnages',
    difficulty: 'Intermédiaire',
    subjectLabel: 'Scénario / personnages (A vs B)',
    subjectPlaceholder: 'Ex: Sherlock Holmes vs Hercule Poirot dans un train',
    canVote: false,
    build: arenaMode
  },
  libre: {
    id: 'libre',
    emoji: '🎨',
    name: 'Libre',
    tagline: 'Personnalise tout — tes propres prompts pour chaque IA',
    difficulty: 'Tous niveaux',
    subjectLabel: 'Sujet de la conversation (optionnel)',
    subjectPlaceholder: 'Ex: voyages spatiaux, philosophie, ou laisse vide',
    canVote: true,
    customPrompts: true,
    build: libreMode
  },

  // ────── SOFT ──────
  jardin: { id: 'jardin', emoji: '🌱', name: 'Jardin', tagline: 'Discussion zen sur la nature et le calme',
    difficulty: 'Soft', subjectLabel: 'Thème zen', subjectPlaceholder: 'Ex: les saisons, méditation, lenteur',
    tier: 'soft', canVote: false, build: jardinMode },
  recette: { id: 'recette', emoji: '🍳', name: 'Recette', tagline: 'Co-création d\'une recette improbable',
    difficulty: 'Soft', subjectLabel: 'Plat à inventer', subjectPlaceholder: 'Ex: tarte aux poireaux et chocolat',
    tier: 'soft', canVote: false, build: recetteMode },
  voyage: { id: 'voyage', emoji: '✈️', name: 'Voyage', tagline: 'Planifier un road-trip imaginaire à deux',
    difficulty: 'Soft', subjectLabel: 'Type de voyage', subjectPlaceholder: 'Ex: tour d\'Europe en train de nuit',
    tier: 'soft', canVote: false, build: voyageMode },
  livre: { id: 'livre', emoji: '📚', name: 'Livre fictif', tagline: 'L\'une décrit, l\'autre devine genre/auteur',
    difficulty: 'Soft', subjectLabel: 'Thème littéraire', subjectPlaceholder: 'Ex: amour à Paris, polar nordique',
    tier: 'soft', canVote: false, build: livreMode },
  critique: { id: 'critique', emoji: '🎨', name: 'Critique d\'art', tagline: 'Décrire et juger des œuvres imaginaires',
    difficulty: 'Soft', subjectLabel: 'Domaine artistique', subjectPlaceholder: 'Ex: peinture cubiste, jazz expérimental',
    tier: 'soft', canVote: false, build: critiqueMode },

  // ────── CHILL ──────
  musique: { id: 'musique', emoji: '🎵', name: 'Battle musicale', tagline: 'Création de paroles à tour de rôle (rap)',
    difficulty: 'Chill', subjectLabel: 'Style', subjectPlaceholder: 'Ex: rap français, funk, blues',
    tier: 'chill', canVote: true, build: musiqueMode },
  sf: { id: 'sf', emoji: '🚀', name: 'SF spéculative', tagline: 'Futur 2200 : optimiste vs pessimiste',
    difficulty: 'Chill', subjectLabel: 'Aspect du futur', subjectPlaceholder: 'Ex: travail, IA, climat, espace',
    tier: 'chill', canVote: true, build: sfMode },
  donjon: { id: 'donjon', emoji: '🎲', name: 'Donjon solo', tagline: 'Une IA narre, l\'autre joue l\'aventurier',
    difficulty: 'Chill', subjectLabel: 'Univers', subjectPlaceholder: 'Ex: donjon dark fantasy, vaisseau spatial',
    tier: 'chill', canVote: false, build: donjonMode },
  pitch: { id: 'pitch', emoji: '💼', name: 'Pitch startup', tagline: 'Entrepreneur enthousiaste vs VC sceptique',
    difficulty: 'Chill', subjectLabel: 'Idée de startup', subjectPlaceholder: 'Ex: app pour chats végan',
    tier: 'chill', canVote: true, build: pitchMode },
  detective: { id: 'detective', emoji: '🧩', name: 'Détectives', tagline: 'Enquête collaborative sur un crime fictif',
    difficulty: 'Chill', subjectLabel: 'Type d\'affaire', subjectPlaceholder: 'Ex: meurtre dans un manoir',
    tier: 'chill', canVote: false, build: detectiveMode },

  // ────── PIQUANT ──────
  roast: { id: 'roast', emoji: '🔥', name: 'Roast amical', tagline: 'Les deux IA se chambrent gentiment',
    difficulty: 'Piquant', subjectLabel: 'Contexte', subjectPlaceholder: 'Ex: collègues de bureau, voisins, frangins',
    tier: 'piquant', canVote: true, build: roastMode },
  avocat: { id: 'avocat', emoji: '😈', name: 'Avocat du diable', tagline: 'L\'une défend l\'indéfendable',
    difficulty: 'Piquant', subjectLabel: 'Position absurde', subjectPlaceholder: 'Ex: l\'ananas sur la pizza est génial',
    tier: 'piquant', canVote: true, build: avocatMode },
  drag: { id: 'drag', emoji: '🎭', name: 'Drag battle', tagline: 'Lecture style RuPaul, shade exquis',
    difficulty: 'Piquant', subjectLabel: 'Contexte du bal', subjectPlaceholder: 'Ex: la finale, le défilé annuel',
    tier: 'piquant', canVote: true, build: dragMode },
  fakenews: { id: 'fakenews', emoji: '📰', name: 'Fake news', tagline: 'Théories délirantes vs debunker',
    difficulty: 'Piquant', subjectLabel: 'Sujet du complot', subjectPlaceholder: 'Ex: les pyramides, la lune',
    tier: 'piquant', canVote: false, build: fakenewsMode },
  therapy: { id: 'therapy', emoji: '💔', name: 'Therapy gone wrong', tagline: 'Thérapeute incompétent vs patient',
    difficulty: 'Piquant', subjectLabel: 'Problème du patient', subjectPlaceholder: 'Ex: peur des canards, jalousie',
    tier: 'piquant', canVote: false, build: therapyMode },

  // ────── EDGY ──────
  trashtalk: { id: 'trashtalk', emoji: '🥊', name: 'Trash talk', tagline: 'Insultes créatives style boxe',
    difficulty: 'Edgy', subjectLabel: 'Type de duel', subjectPlaceholder: 'Ex: combat de boxe, championnat eSport',
    tier: 'edgy', canVote: true, build: trashtalkMode },
  souper: { id: 'souper', emoji: '🍷', name: 'Souper arrosé', tagline: 'Conversation de plus en plus décousue',
    difficulty: 'Edgy', subjectLabel: 'Sujet de table', subjectPlaceholder: 'Ex: la politique, le sens de la vie',
    tier: 'edgy', canVote: false, build: souperMode },
  badcop: { id: 'badcop', emoji: '👹', name: 'Bad cop / bad cop', tagline: 'Deux flics ripoux interrogent un suspect',
    difficulty: 'Edgy', subjectLabel: 'Crime supposé', subjectPlaceholder: 'Ex: cambriolage de banque, vol de chat',
    tier: 'edgy', canVote: false, build: badcopMode },
  humournoir: { id: 'humournoir', emoji: '⚰️', name: 'Humour noir', tagline: 'Cynisme lucide, dérision absurde',
    difficulty: 'Edgy', subjectLabel: 'Thème grinçant', subjectPlaceholder: 'Ex: bureaucratie, modernité, métros',
    tier: 'edgy', canVote: true, build: humournoirMode }
};
