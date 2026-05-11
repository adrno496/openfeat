# 👑 Règne

> Un jeu de gouvernance IA. Tu es à la tête d'un pays. Chaque décision modifie l'état de ta nation et l'IA réécrit la suite de ton histoire — cohérente avec tout ce que tu as fait.

## Concept

**Règne** est un jeu narratif où l'IA joue le rôle du monde autour de toi. Chaque tour, un événement politique, économique ou social t'est présenté avec 4 réponses possibles — et un 5ᵉ choix : écris **ta propre décision**, l'IA l'évaluera et générera ses conséquences.

Cinq jauges suivent la santé de ta nation : **Économie**, **Armée**, **Soutien populaire**, **Diplomatie**, **Trésor**. Si l'une tombe à 0 ou monte à 100, ton règne s'achève. Plus tu tiens longtemps, plus l'Histoire te jugera favorablement — ou cruellement. Aucun contenu n'est pré-écrit : chaque partie est unique parce que l'IA tient compte de tes décisions passées pour construire les suivantes.

Inspirations assumées : *Reigns* (mécanique), *80 Days* (narration), *Civilization* (jauges), *Papers Please* (atmosphère).

---

## Démarrage rapide

### 1. Obtenir une clé API IA (2 minutes)

Le plus simple est **Groq**, qui offre un quota gratuit généreux :

1. Crée un compte sur [console.groq.com](https://console.groq.com/keys)
2. Génère une API key
3. Lance Règne, va dans **⚙ Paramètres**, colle la clé

Modèle recommandé : **Llama 3.3 70B Versatile** (~0.08$ pour une partie de 30 tours).

#### Alternatives gratuites
- **OpenRouter → Gemini 2.0 Flash (free)** — totalement gratuit, qualité honnête
- **OpenRouter → Llama 3.3 70B (free)** — gratuit, qualité narrative supérieure

#### Alternatives payantes premium
- **Anthropic Claude Haiku 4.5** — narration de très haut niveau (~0.5$/partie)
- **OpenAI GPT-4o mini** — très bon rapport qualité/prix

### 2. Tester en local (sans Android)

```bash
npm install
npx serve www/   # ou : python3 -m http.server 8000 --directory www
```

Ouvre [http://localhost:3000](http://localhost:3000).

### 3. Build Android

```bash
npx cap add android
npx cap sync android
npx cap open android   # Ouvre Android Studio
```

L'app a `appId: app.smartlife.regne`.

---

## Architecture

```
regne/
├── capacitor.config.json
├── package.json
├── test.mjs                  # 60+ tests Node natif
├── README.md
└── www/
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── app.js              # Orchestration, routing, game loop
        ├── ai-client.js        # Multi-provider IA + compteur tokens
        ├── ai-narrator.js      # Prompts IA + nations de secours
        ├── storage.js          # localStorage + IndexedDB
        ├── game-engine.js      # Jauges, game over, scoring, achievements
        ├── format.js           # Formatters & helpers
        ├── ui-setup.js         # Création de partie
        ├── ui-game.js          # Écran de jeu principal
        ├── ui-consequence.js   # Affichage de la conséquence
        ├── ui-gameover.js      # Fin de règne + épitaphe
        ├── ui-history.js       # Archives des règnes passés
        └── ui-settings.js      # Provider, clé API, modèle, coûts
```

### Stack & contraintes

- **Capacitor 8 + Vanilla JS ES modules** — aucune dépendance front-end (pas de React, Vue, TS)
- **Stockage 100% local** — `localStorage` (settings, partie en cours, records) + `IndexedDB` (historique des parties)
- **Aucun backend** — pas de Supabase, pas de Firebase
- **Multi-provider IA** — l'utilisateur fournit sa propre clé, choix entre 5 fournisseurs

### Données

| Clé / store | Type | Contenu |
|---|---|---|
| `regne_settings` (localStorage) | Object | Provider, modèle, clé API, compteurs cumulés de tokens/coûts |
| `regne_current_game` (localStorage) | Object | État complet de la partie en cours (reprise au lancement) |
| `regne_records` (localStorage) | Object | Best score, total parties, total tours, achievements débloqués |
| `regne_db.games` (IndexedDB) | Object par id | Parties terminées : tours, choix, conséquences, épitaphe, score |

---

## Coûts par partie (estimation)

Calcul basé sur ~1600 tokens par tour (1050 in + 550 out) — un événement + une conséquence.

| Provider · Modèle | 10 tours | 30 tours | 60 tours |
|---|---|---|---|
| OpenRouter · Gemini 2.0 Flash (free) | **Gratuit** | **Gratuit** | **Gratuit** |
| OpenRouter · Llama 3.3 70B (free) | **Gratuit** | **Gratuit** | **Gratuit** |
| Groq · Llama 3.1 8B Instant | <0.01$ | 0.03$ | 0.06$ |
| Groq · Llama 3.3 70B Versatile | 0.03$ | 0.08$ | 0.16$ |
| OpenAI · GPT-4o mini | 0.01$ | 0.04$ | 0.08$ |
| Anthropic · Claude Haiku 4.5 | 0.07$ | 0.20$ | 0.40$ |
| OpenAI · GPT-4o | 0.07$ | 0.20$ | 0.40$ |

Le compteur exact (tokens utilisés + coût cumulé estimé) est visible dans **⚙ Paramètres**.

---

## Mécaniques de jeu

### Jauges (0-100)
- **0** ou **100** → game over avec narration adaptée
- **15-** ou **85+** → zone de danger (la jauge clignote, l'IA génère des événements liés)
- **30-70** sur tout le tableau → achievement *Équilibriste*

### Difficultés
| Mode | Modifier | Comportement |
|---|---|---|
| Diplomate | +10 | Marges confortables, idéal débutant |
| Gouvernant | 0 | Standard |
| Conquérant | -10 | Tendu dès le départ |
| Tyran | -20 + 1 jauge à 15 | Brutal, partie courte attendue |

### Types de fin
| Type | Conditions | Multiplicateur de score |
|---|---|---|
| 💀 Catastrophique | < 5 tours | × 0.3 |
| ⛓ Mauvais | ≥ 5 tours | × 0.7 |
| ⚖ Neutre | ≥ 10 tours | × 1.0 |
| ⚔ Bon | ≥ 20 tours, moyenne ≥ 45 | × 1.5 |
| 👑 Glorieux | ≥ 30 tours, moyenne ≥ 55 | × 2.0 |
| ✨ Légendaire | ≥ 50 tours, moyenne ≥ 65 | × 3.0 |

### Achievements
10 réalisations débloquables (premier règne, demi-siècle, équilibriste, génie militaire, bien-aimé, etc.).

### Cohérence narrative
À chaque tour, l'IA reçoit un contexte compact (~1k tokens) qui inclut :
- Le pays, l'époque, le dirigeant
- Les 5 jauges actuelles avec marqueurs CRITIQUE / EXCÈS
- Jusqu'à 10 *faits clés* du règne (alliances, guerres, crises majeures)
- Les 5 dernières décisions (titre, choix, résultat)

Cela permet à l'IA de générer des événements qui **citent explicitement** ce qui s'est passé avant — plutôt que des événements génériques sans mémoire.

### Choix libre (5ᵉ option)
Toujours présent. L'utilisateur écrit jusqu'à 280 caractères. Une seconde requête IA évalue la pertinence (qualité 0-100), assigne une philosophie politique, et génère des impacts bornés à ±15 par jauge.

### Mode démo / fallback
Si l'API IA échoue (clé invalide, hors ligne, JSON malformé), Règne tombe sur :
- Une **nation de secours** prédéfinie (1 par grande époque, 5 minimum)
- Un **événement de secours** générique adapté à la jauge la plus basse
- Une **épitaphe templatée**

Le joueur voit toujours un badge `⚠ Mode démo`. Une partie reste jouable même hors ligne tant qu'elle a déjà commencé.

---

## Tests

```bash
node test.mjs        # 60+ tests unitaires (game-engine, format, storage, ai-client, ai-narrator)
npm run check        # node --check sur les 12 fichiers JS
```

Couverture :
- `game-engine.js` — game over, impacts, scoring, achievements, difficultés (~30 tests)
- `format.js` — tous les formatters
- `storage.js` — round-trips localStorage, records, tokens cumulés
- `ai-client.js` — coûts, parsing JSON tolérant, providers
- `ai-narrator.js` — contexte compact, fallback nations
- Cohérence globale — partie simulée jusqu'à game over

---

## Design choices

### Polices
- **Cinzel** — titres royaux (`Cinzel 700`). Inspirée des inscriptions latines, parfaite pour l'atmosphère monarchique.
- **Lora** — narration. Lisibilité longue + caractère, sans formalité excessive.
- **JetBrains Mono** — jauges et compteurs. Aligne les chiffres, lisibilité technique.

### Palette
Parchemin sombre (`#0d0a06`), or royal (`#c9a961`), bordeaux sang (`#7d1f2e`), bleu royal (`#1f3d7d`). Jamais de noir pur, jamais de blanc pur — l'œil reste reposé, le contraste reste élevé.

### Mobile-first
Layout pensé pour 360 px de large minimum. Toutes les zones tactiles ≥ 44 px. `safe-area-inset-*` pour iPhone notch.

---

## Roadmap (Phase 2)

- [ ] **Illustrations IA** par événement (image API → DALL-E mini, Stable Diffusion, etc.)
- [ ] **Musique d'ambiance** procédurale (Capacitor Audio, ambient packs par atmosphère)
- [ ] **Multijoueur asynchrone** : comparer ses règnes avec ceux d'amis (lien partageable)
- [ ] **Classement mondial** (nécessiterait un petit backend)
- [ ] **Événements multi-pays** : diplomatie entre joueurs réels
- [ ] **Personnalisation des conseillers** : l'IA peut faire revenir le même conseiller plusieurs tours (continuité narrative)
- [ ] **Mode chronique** : plusieurs règnes successifs dans la même nation (héritage)
- [ ] **Export PDF** d'une chronique de règne pour partage

---

## Licence

MIT. Fais-en ce que tu veux, mais cite la source si tu publies une dérivation publique.

🤖 Construit avec [Claude Code](https://claude.com/claude-code).
