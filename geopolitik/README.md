# Geopolitik 🏛

> Diriger un pays. Dominer le siècle.

Simulateur géopolitique : vous prenez la tête d'une nation et la menez de Petit pays à Hégémon mondial à travers les crises, les alliances et les choix de doctrine.

Stack identique à FinMot et Crypto Tycoon : **Capacitor 8 + Vanilla JS + LocalStorage**. ~3 200 lignes, 54/54 tests passants.

---

## 🚀 Démarrage rapide

```bash
cd ~/Downloads/geopolitik
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Build CLI :
```bash
npm run sync
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew bundleRelease
```

---

## 🎮 Concept

**Vous démarrez à la tête d'une république générée aléatoirement, avec 100 d'influence mondiale.**

Votre objectif : devenir Hégémon (2 500 d'influence) puis Dominateur du siècle (4 000+).

Pour y arriver, vous gérez 5 piliers, choisissez votre doctrine, et naviguez les chocs géopolitiques.

### Les 5 piliers

| Pilier | Couleur | Effet |
|--------|---------|-------|
| 💰 Économie | Or | Génère le trésor, base de tout |
| 🪖 Militaire | Rouge | Projection de force, indispensable en conflit |
| 🔬 Technologie | Violet | Edge à long terme, multiplie les autres secteurs |
| 🤝 Diplomatie | Bleu | Soft power, alliances, débloque les actions diplo |
| 🏛 Société | Vert | Stabilité interne, démographie |

**Influence = 0,30 × Économie + 0,22 × Militaire + 0,20 × Tech + 0,15 × Diplo + 0,13 × Société**

### Les 7 doctrines (modes de gouvernance)

Chacune apporte des multiplicateurs spécifiques. Changer coûte 20 points de stabilité et 12 mois de cooldown.

| Doctrine | Tier | Edge |
|----------|------|------|
| 📜 Démocratie Libérale | 0 | Équilibrée, bonus diplo +15% |
| 👑 Autocratie | 1 | Militaire +30%, malus diplo |
| ⚙️ Technocratie | 2 | Tech +40%, économie +15% |
| 💰 Mercantilisme | 2 | Économie +35%, malus diplo |
| ☪ Théocratie | 3 | Société +30%, malus tech sévère |
| 🏝 Isolationnisme | 3 | Immune à 50% des events négatifs externes |
| 🌐 Empire Hégémonique | 5 | Tous boostés, mais coût stabilité |

### Les 6 puissances mondiales

USA 🇺🇸, Chine 🇨🇳, UE 🇪🇺, Russie 🇷🇺, Inde 🇮🇳, Golfe 🌅

Relations de -100 à +100. Actions diplomatiques :
- **Sommet** (15 diplo) : +8 à +12
- **Alliance** (30 diplo) : +15 à +25
- **Réprimande** (5 diplo) : -12 à -18

### 15 événements mondiaux

5 positifs (boom mondial, percée IA, sommet diplomatique, dividende démographique, nouvelle route commerciale), 3 neutres/mixtes (élections USA, conflit régional, crise migratoire), 7 négatifs (crise financière, pandémie, cyberattaque, choc énergétique, catastrophe climatique, tensions superpuissances, troubles intérieurs).

La **tension mondiale** (KPI dans le header) booste la probabilité d'événements négatifs.

### 8 tiers de progression

Petit pays (0) → Régional (100) → Puissance moyenne (250) → Grande puissance (500) → Puissance majeure (900) → Superpuissance (1500) → Hégémon (2500) → Dominateur (4000)

### 15 trophées

Avec rewards en trésor (de 30M$ à 2 000M$). Inclut des objectifs contrariens : "Pacifiste hégémonique" (1000 d'influence avec Militaire < 100), "Splendide isolement" (800 sous Isolationnisme), "Siècle de paix" (100 mois sans event négatif).

---

## 📁 Structure

```
geopolitik/
├── capacitor.config.json
├── package.json
├── README.md
├── PRIVACY.md
├── PLAYSTORE.md
├── test.mjs
└── www/
    ├── index.html
    ├── css/styles.css         (~830 lignes, terminal géopolitique)
    ├── js/
    │   ├── app.js             (orchestration UI, 5 panels)
    │   ├── nation.js          (état du joueur, allocation, tick)
    │   ├── world.js           (6 puissances, relations, tension)
    │   ├── doctrine.js        (7 doctrines, switch, multipliers)
    │   ├── events.js          (15 événements mondiaux)
    │   ├── progression.js     (8 tiers + 15 trophées)
    │   ├── chart.js           (canvas influence chart)
    │   └── save.js            (persistence + utils)
    └── icons/
```

---

## 🎨 Direction esthétique

**Terminal géopolitique** — distinct visuellement de Crypto Tycoon (vert/or) et FinMot (or pur).

- Background : `#0a0b0d`
- Bleu diplomatique : `#3d6dd9` (accent primaire, branding)
- Or : `#d4a843` (économie, trésor, achievements)
- Rouge sang : `#c83a3a` (militaire, événements bad)
- Violet : `#8a4fb8` (technologie, futur)
- Vert : `#0db77b` (société, croissance)

Chaque secteur a sa propre couleur — les bordures gauche des cartes secteur changent en fonction du pilier.

Police titre : **Newsreader italique** (vibes "Foreign Affairs magazine")
Police chiffres : **JetBrains Mono**
Police UI : **Geist**

---

## ⚖️ Équilibrage

- **1 tick = 1 mois en jeu** (toutes les 2 secondes en temps réel)
- **Trésor mensuel** : 5% du PIB × multiplicateur doctrine
- **10% du trésor** dépensé chaque mois selon allocation
- **Decay 0,5%/mois** sur tous les secteurs (entropy géopolitique — sans investissement, tu régresses)
- **Probabilité d'event** : 0,3% à 1,2% par tick × tension/50
- **Cooldown event** : 8 ticks après chaque déclenchement
- **Anti-répétition** : 200 ticks min entre deux occurrences du même event
- **Offline cap** : 12h

**À monitorer** : combien de joueurs atteignent "Régional" (100 d'influence) en J1 ? Cible 70%. Combien atteignent "Hégémon" (2500) ? Cible 3-5% à J7.

---

## 🔮 Roadmap post-launch

**v1.1 — Profondeur stratégique**
- [ ] Conflits actifs (déclarer / subir une guerre, modélisation balance militaire)
- [ ] Espionnage (action vs autre puissance)
- [ ] Sanctions économiques mutuelles
- [ ] 5 nouvelles doctrines : Anarcho-capitalisme, Communisme, Cyberpunk State, Eco-state, Cyberpunk

**v1.2 — Engagement quotidien**
- [ ] Notifications push (event majeur, milestone tier)
- [ ] Mission quotidienne "Atteindre +10 d'influence aujourd'hui"
- [ ] Headlines journal généré par tick (lecture optionnelle)

**v1.3 — Compétition**
- [ ] Leaderboard mondial hebdo (Supabase) — meilleur tier atteint
- [ ] Mode Scenarios (1948 Cold War, 2010 Crisis, 2030 AI Race)
- [ ] Profil partageable de fin de partie

**v1.4 — Monétisation freemium**
- [ ] Geopolitik Pro (RevenueCat, 4,99€) :
  - Pas de pubs
  - Toutes les doctrines débloquées
  - Mode sandbox (capital initial customisable)
  - Stats avancées + export
  - Offline cap 24h
- [ ] AdMob rewarded video (boost trésor, retry switch doctrine)

---

## 💡 Avantage stratégique

**Le segment "civ-like sur mobile" est mal servi.** Civilization VI mobile coûte 25€, est lourd, complexe pour mobile. Les concurrents idle (genre "Idle Politics") sont caricaturaux.

**Geopolitik prend une voie médiane** :
- Profondeur réaliste (5 piliers + doctrines + 6 puissances + 15 events)
- Mécaniques mobile-friendly (sliders, tabs, sessions courtes possibles)
- Free-to-play accessible
- UI premium (terminal Bloomberg-meets-Foreign-Affairs)

**Cible** : 25-50 ans, fans de stratégie + curieux géopolitiques. Audience overlap massive avec NEXUS/CONTRARIO.

**Synergies de contenu** :
- Article CONTRARIO sur la doctrine technocratique chinoise → tweet "Geopolitik vous fait jouer une Technocratie, voilà ce que ça donne en simulation"
- Newsletter NEXUS sur tensions Taiwan → screenshot d'un game-state où les tensions USA-CHINE sont à 90

---

## 🧪 Tests

54 tests couvrant :
- Initialisation Nation, World, Doctrines
- Calcul d'influence et tick
- Déterminisme (même seed → même résultat)
- Allocation rebalancing
- Switch doctrine + cooldown + déblocages
- Diplomatie (summit/alliance/rebuke)
- Event engine (probabilités, modifiers, anti-répétition)
- Progression tiers + achievements
- Sérialisation round-trip
- Formatters (date, treasury, relations)
- Simulation 10 ans avec stratégie passive

Lancer : `node test.mjs`

---

Made with Claude Code × SmartLife — 2026
