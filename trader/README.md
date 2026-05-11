# HL TRADER

Application Android (Capacitor 8 + Vanilla JS) qui exécute un bot de trading
multi-stratégies sur Hyperliquid (perps avec levier).

L'app s'exécute entièrement dans la WebView : pas de serveur, pas de proxy. La
clé privée est stockée côté natif via `@capacitor/preferences` (Android
SharedPreferences chiffré).

## Prérequis

- Node.js 18+
- Android Studio Hedgehog ou plus récent, avec un SDK Android API 26+
- Java 21 (pour Gradle / Capacitor 8) — sur macOS :
  `export JAVA_HOME=/opt/homebrew/opt/openjdk@21`

## Installation

```bash
npm install --legacy-peer-deps
npx cap sync android
npx cap open android
# puis dans Android Studio : Run > Run 'app'
```

Note : `--legacy-peer-deps` est nécessaire car les plugins Capacitor 6
(preferences, network, etc.) déclarent un peer `@capacitor/core ^6` alors qu'on
utilise core 8. C'est sans impact à l'exécution — c'est uniquement npm qui est
trop strict.

## Setup wallet (premier lancement)

1. Au premier lancement, l'app affiche un onboarding 3 étapes :
   - Créer un wallet (dérivé via `ethers.Wallet.createRandom()`) ou importer
     une clé privée existante.
   - Choisir le réseau (testnet recommandé pour démarrer).
   - Ping de l'API Hyperliquid pour valider la connexion.
2. La clé privée est sauvegardée dans le keystore Android via
   `@capacitor/preferences`. Elle n'est jamais exposée dans les logs.
3. **Il est très fortement recommandé d'utiliser un wallet dédié au bot, pas
   votre wallet principal.**

## Setup testnet

1. Créer/importer un wallet (étape 1 de l'app).
2. Pour activer un compte HL, **un dépôt initial USDC sur le mainnet est
   requis** (c'est une exigence côté Hyperliquid, pas du bot).
3. Une fois le compte activé, claimer du faux USDC :
   <https://app.hyperliquid-testnet.xyz/drip> (1 000 USDC fictifs).
4. Lancer le bot depuis le Dashboard.

## Passer en mainnet

Settings → Réseau → Mainnet → confirmer l'avertissement. Le bot redémarre avec
la nouvelle URL d'API. **Les fonds engagés sont réels.**

## Stratégies

Six stratégies pondérées agrègent leurs signaux :

| Stratégie    | Poids | Description                                |
| ------------ | ----- | ------------------------------------------ |
| EMA Cross    | 0.20  | Croisement EMA 9/21 + filtre tendance 50  |
| RSI          | 0.18  | Sortie de zones survendue/surachetée      |
| MACD         | 0.18  | Croisement de l'histogramme               |
| Bollinger    | 0.17  | Rebond/rejet sur les bandes               |
| VWAP         | 0.12  | Déviation par rapport au VWAP             |
| Sentiment    | 0.15  | Fear & Greed contrarien                   |

Trade ouvert si `weighted_score >= 0.62` ET `≥ 2 stratégies` accordées.

## Risk management

- Sizing : `(capital × 1.5%) / (ATR × 1.5)`
- Reward / Risk : 2.0
- Max positions simultanées : 3
- Circuit breaker : -8% / jour → trading suspendu
- SL et TP placés en triggers reduce-only sur HL après l'entrée

## Architecture

```
www/
  index.html              Shell + CDN (ethers, msgpack, Chart.js)
  css/                    Styles par écran (mobile-first, terminal Bloomberg)
  js/
    app.js                Bootstrap + AppState + routeur d'écrans
    core/
      storage.js          @capacitor/preferences wrapper + DEFAULT_CONFIG
      signer.js           Signature HL (msgpack + keccak + EIP-712 phantom-agent)
      exchange.js         Wrapper REST /info + /exchange
      bot.js              Boucle de trading (setInterval), risk, circuit breaker
      notifications.js    @capacitor/local-notifications wrapper
    strategies/
      indicators.js       EMA, RSI, MACD, Bollinger, ATR, VWAP (fonctions pures)
      ema_cross.js, rsi.js, macd.js, bollinger.js, vwap.js, sentiment.js
      consensus.js        Agrégateur pondéré
    ui/
      nav.js, toast.js, chart.js
    screens/
      setup.js, dashboard.js, positions.js, signals.js, settings.js
```

## Tests rapides (sans device)

Ouvrir `www/index.html` dans un navigateur desktop. L'écran setup s'affiche.
Dans la console DevTools :

```js
const m = await import('./js/strategies/indicators.js');
m.rsi([10,11,12,13,12,11,10,9,8,9,10,11,12,13,14], 14);   // → ~0..100
m.atr([{h:'12',l:'10',c:'11'},{h:'13',l:'11',c:'12'},{h:'14',l:'12',c:'13'}], 2);
```

## Sécurité

- La clé privée est stockée via `@capacitor/preferences` qui utilise
  `SharedPreferences` Android — non lisible par d'autres apps.
- Toutes les requêtes signées passent par `signer.js` qui implémente le schéma
  HL (msgpack + keccak + EIP-712 phantom-agent). Référence :
  <https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/signing>
- Aucune donnée ne quitte l'appareil sauf vers `api.hyperliquid.xyz` /
  `api.hyperliquid-testnet.xyz` et `api.alternative.me/fng/`.

## Limitations connues

- Le bot s'exécute dans un `setInterval` côté WebView. Android peut throttle
  l'exécution quand l'écran est éteint. Pour une exécution permanente,
  envisager un `BackgroundRunner` Capacitor ou un foreground service en
  follow-up.
- L'arrondi des prix utilise une heuristique (1–6 décimales selon
  l'ordre de grandeur) qui couvre BTC/ETH/SOL. Pour des coins exotiques avec
  des règles `szDecimals` plus restrictives, ajuster `formatPrice()` dans
  `exchange.js`.
