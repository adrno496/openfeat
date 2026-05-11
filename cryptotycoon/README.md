# Crypto Trader Tycoon 📈

> Le simulateur de trading crypto. Bots automatisés. Événements de marché. Progression jusqu'au statut de Whale.

Stack identique à FinMot et GOAT FUEL : **Capacitor 8 + Vanilla JS + LocalStorage**. Pas de backend, pas de pub, pas de tracking. Code ~2000 lignes, testé (42/42 tests passants).

---

## 🚀 Démarrage rapide (Claude Code)

```bash
cd ~/Downloads/cryptotycoon
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Puis dans Android Studio : **Build > Generate Signed Bundle / APK > AAB**.

Ou en CLI :

```bash
npm run sync
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew bundleRelease
```

L'AAB est dans `android/app/build/outputs/bundle/release/app-release.aab`.

---

## 🎮 Concept de gameplay

**Démarre à $100, monte au statut de Crypto Mogul ($1B+).**

Le joueur trade 5 cryptos (BTC, ETH, SOL, DOGE, PEPE) débloquées progressivement, achète des bots qui tradent en autonomie même offline (jusqu'à 12h), et survit aux événements de marché (halvings, krachs, FOMO retail, hacks d'exchange, etc.).

### Mécaniques clés

**Marché simulé** (modèle Geometric Brownian Motion par asset)
- 5 régimes : Bull, Bear, Choppy, Euphoria, Capitulation
- Drift et volatilité spécifiques par crypto
- Tick toutes les 2 secondes

**12 événements aléatoires** modifient temporairement le marché :
- ☀️ Halving BTC, Approbation ETF, FOMO retail, Tweet d'Elon, CPI dovish, Fed dovish, Levée VC
- 🚨 Hack d'exchange, Régulation US, Stablecoin depeg, Krach FTX-style, Choc géopolitique

**5 bots débloquables** (par tier de portfolio)
- **DCA Bot** ($500) — achat régulier de BTC
- **Momentum Bot** ($5K) — pari sur les tendances ETH
- **Grid Bot** ($25K) — capture la volatilité SOL
- **AI Alpha Bot** ($100K) — adapte l'exposition au régime
- **Arbitrage Bot** ($500K) — profit régulier indépendant du marché

**10 tiers** de progression (Retail → Bronze → Argent → Or → Platine → Diamant → Million → Hedge Fund → Whale → Mogul)

**13 trophées** avec rewards cash ($50 à $25K)

---

## 📁 Structure

```
cryptotycoon/
├── capacitor.config.json
├── package.json
├── README.md
├── PRIVACY.md
├── PLAYSTORE.md
└── www/
    ├── index.html
    ├── css/
    │   └── styles.css         (~700 lignes, esthétique terminal)
    ├── js/
    │   ├── app.js             (~480 lignes, orchestration UI)
    │   ├── market.js          (simulation GBM + cycles + events)
    │   ├── portfolio.js       (cash, holdings, P&L, fees 0.1%)
    │   ├── bots.js            (5 bots avec stratégies distinctes)
    │   ├── events.js          (12 événements de marché)
    │   ├── progression.js     (tiers, déblocages, achievements)
    │   ├── chart.js           (canvas line chart avec gradient)
    │   └── save.js            (persistence + offline gains 12h max)
    └── icons/
```

---

## 🎨 Direction esthétique

**Terminal financier raffiné, mobile-first.** Cohérent avec FinMot pour cross-promo dans l'écosystème SmartLife.

- Background : `#0a0b0d` (noir profond)
- Or : `#d4a843` (accents primaires, tier progression)
- Vert : `#0db77b` (positions positives, bull, achats)
- Rouge : `#e23d3d` (positions négatives, bear, ventes)
- Police chiffres : **JetBrains Mono** 700
- Police titres : **Newsreader** italic 700
- Police UI : **Geist** 500–600

---

## ⚖️ Équilibrage

Quelques chiffres pour iterer après les premiers tests utilisateurs :

- Capital de départ : $100
- Tick rate : 2s (1800 ticks/heure)
- Fees : 0.1% par trade
- Volatilité BTC/ETH/SOL/DOGE/PEPE : 3.8% / 5.5% / 8.5% / 14% / 22% par tick
- Régime BULL : drift × 2.5
- Régime CAPITULATION : drift × −5.0
- Probabilités événements : 0.2% à 1.2% par tick (cooldown 30 ticks après chaque)
- Offline cap : 12 heures

**À monitorer post-launch** : combien de joueurs atteignent $1K en J1 ? (cible : 60–70%) Combien atteignent $1M ? (cible : 5% à J7) Si trop facile → augmenter volatilité bear, réduire bots earnings. Si trop dur → augmenter rewards achievements.

---

## 🎯 Assets à finaliser avant Play Store

### App icon (1024×1024)

Suggestion à demander à Claude Code :
> "Génère un app icon 1024×1024 carré pour Crypto Trader Tycoon : fond noir profond #0a0b0d, ligne de chart ascendante en vert #0db77b avec un point glow à la fin, en arrière-plan un symbole '$' ou '₿' subtil en or #d4a843. Style terminal Bloomberg minimaliste, distinct de FinMot (qui utilise un F italique)."

### Screenshots (1080×2400 recommandé)

5 captures à faire :
1. Dashboard principal (portfolio + asset list + chart BTC)
2. Trade modal (Acheter avec slider et presets)
3. Panel Bots (DCA owned, autres locked)
4. Panel Trophées (mix locked/unlocked)
5. Event banner actif (ex: "📰 BTC HALVING — émission divisée par 2")

### Feature graphic Play Store (1024×500)

Suggestion : ligne de chart verte ascendante massive sur fond noir, titre "CRYPTO TRADER TYCOON" en JetBrains Mono Bold, accroche "Start with $100. Become a Whale."

---

## 🔮 Roadmap post-launch

**v1.1 — Engagement & rétention**
- [ ] Notifications push : "Un événement de marché vient de démarrer" (Capacitor LocalNotifications)
- [ ] Daily login bonus
- [ ] Mission quotidienne ("Faire un trade gagnant aujourd'hui")
- [ ] Plus de cryptos (ARB, INJ, TIA, memes du moment)

**v1.2 — Profondeur stratégique**
- [ ] Leverage trading (2x, 5x, 10x — risque liquidation)
- [ ] Stop-loss / Take-profit manuels
- [ ] News feed simulé (headlines en temps réel)
- [ ] Régimes additionnels (Stagflation, Recovery)

**v1.3 — Compétition sociale**
- [ ] Leaderboard global hebdo (Supabase) — top portfolio value
- [ ] Profil joueur partageable (achievements, stats)
- [ ] Competitions saisonnières

**v1.4 — Monétisation freemium**
- [ ] Tycoon Pro (RevenueCat, 4,99€) :
  - Pas de pubs
  - +1 bot starter offert
  - Skins de terminal (Bloomberg, Cyberpunk, Retro 80s)
  - Offline cap étendu à 24h
  - Stats avancées (Sharpe, max drawdown, etc.)
- [ ] Bundle gems pour rewinds (annule la dernière action) ou time-skip
- [ ] AdMob rewarded video (+1h offline boost, double rewards d'event)

---

## 💎 Avantage stratégique vs concurrents

**vs Crypto Idle Miner / Crypto Tycoon (Play Store) :**
- Mécaniques de marché réalistes (pas que de l'idle clicker)
- Événements basés sur de vraies dynamiques de marché crypto
- Profondeur stratégique (régimes, allocation, bots distincts)
- UI premium (la plupart des concurrents ont un look amateur)

**Cible utilisateur** : 25–45 ans, gamers casual qui s'intéressent aux cryptos sans avoir le capital pour trader vraiment. Audience massive sous-monétisée par les apps crypto sérieuses (qui font fuir les non-experts).

**Funnel UA** : ASO sur "crypto game", "trading simulator", "tycoon crypto" + cross-promo sur tes propriétés (NEXUS, CONTRARIO, FinMot, Alpha Terminal).

---

## 🧪 Tests

42 tests d'intégration couvrant :
- Simulation de marché (déterminisme, prix > 0)
- Trades (buy/sell, fees, P&L réalisé)
- Rejets (cash insuffisant, units insuffisants)
- Bots (achat, upgrade, déblocage, tick DCA)
- Events (déclenchement, modifiers)
- Progression (tiers, achievements, déblocages)
- Sérialisation round-trip
- Formatters
- Simulation full game loop 1h

Lancer : `node test.mjs`

---

Made with Claude Code × SmartLife — 2026
