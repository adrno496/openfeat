# FinMot 🟨

> Le mot du jour. Vocabulaire de la finance, des marchés, de la macroéconomie et de la géopolitique.

Wordle daily en français spécialisé finance, prêt à publier sur le Play Store. Stack identique à GOAT FUEL : **Capacitor 8 + Vanilla JS + LocalStorage** (pas de backend pour le MVP).

---

## 🚀 Démarrage rapide (Claude Code)

```bash
cd ~/Downloads/finmot
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

L'AAB sera dans `android/app/build/outputs/bundle/release/app-release.aab`.

---

## 📁 Structure

```
finmot/
├── capacitor.config.json   ← App ID, splash, status bar
├── package.json            ← Dépendances Capacitor 8
├── README.md
├── PRIVACY.md              ← Privacy policy (à héberger)
├── PLAYSTORE.md            ← Listing copy FR + EN
└── www/
    ├── index.html          ← Page principale
    ├── css/
    │   └── styles.css      ← Esthétique terminal financier
    ├── js/
    │   ├── app.js          ← Orchestration UI
    │   ├── game.js         ← Logique de jeu
    │   ├── words.js        ← BDD mots + getDailyWord
    │   ├── stats.js        ← Stats localStorage
    │   ├── share.js        ← Partage Web Share API
    │   └── i18n.js         ← FR / EN
    └── icons/              ← À générer (voir ci-dessous)
```

---

## 🎨 Assets à finaliser avant upload Play Store

### 1. App icon (obligatoire)

Tu peux générer en SVG puis convertir, ou demander à Claude Code :

> "Génère-moi un app icon 1024×1024 pour FinMot : carré noir profond #0a0b0d, lettre 'F' or #d4a843 en JetBrains Mono Bold avec un point '.' à la fin pour évoquer un cours boursier. Style terminal Bloomberg minimaliste."

Place ensuite l'icon dans `android/app/src/main/res/mipmap-*` (Android Studio > Image Asset Studio recommandé).

### 2. Splash screen

Couleur de fond : `#0a0b0d` (déjà configurée dans capacitor.config.json).
Logo centré 512×512 sur fond transparent — réutilise l'app icon.

### 3. Feature graphic Play Store (1024×500)

Suggestion : fond noir, grille de tiles `🟩🟨⬛` en arrière-plan flou + titre "FinMot" en Newsreader italic + accroche "Le mot du jour. Finance."

### 4. Screenshots (min. 2, max. 8 — format 1080×1920 ou 1080×2400)

Capture les 4 écrans clés :
1. Plateau en cours de partie (~3 essais)
2. Modal résultat avec définition
3. Modal stats (avec un peu de data)
4. Modal règles

→ Utilise un device émulateur Pixel 7 + screenshot, ou physique.

---

## 🔐 Signature (release)

Génère ton keystore (à conserver précieusement, sinon plus de mises à jour possibles) :

```bash
keytool -genkey -v -keystore ~/finmot-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias finmot
```

Crée `android/app/finmot-release.properties` :

```
storeFile=/Users/<toi>/finmot-release.jks
keyAlias=finmot
storePassword=...
keyPassword=...
```

Et configure `android/app/build.gradle` pour signer en release (Capacitor docs).

---

## 📝 Versioning

Avant chaque submission Play Store :

```kotlin
// android/app/build.gradle
android {
    defaultConfig {
        versionCode 1   // incrémenter à chaque upload
        versionName "1.0.0"
    }
}
```

---

## 🔮 Roadmap post-launch

**v1.1 — Engagement & rétention**
- [ ] Notification push à 9h "Le mot du jour est dispo" (Capacitor LocalNotifications)
- [ ] Mode darkroom : 2e mot du jour bonus en mode "expert" (mots de 6 lettres)
- [ ] Streak shield : pardon de 1 jour manqué par mois

**v1.2 — Social & viral**
- [ ] Leaderboard global (Supabase) — temps de résolution
- [ ] Profil joueur + historique des définitions apprises
- [ ] Mode duel async (envoie un mot à un ami)

**v1.3 — Monétisation**
- [ ] FinMot+ (RevenueCat) : 2,99€/mois ou 24,99€/an
  - Mode hard (6-7 lettres)
  - Archive complète des mots passés
  - Stats avancées + export CSV
  - Pas de pub
- [ ] Sinon : AdMob banner discret + interstitial post-game (1/3 parties)

**v1.4 — Cross-promo SmartLife**
- [ ] Bandeau "Tu as aimé FinMot ? Découvre Alpha Terminal" en fin de partie
- [ ] Lien GoatFuel pour les utilisateurs sportifs

---

## 💎 Avantage stratégique

- **Coût marginal quasi-nul** : tout en localStorage, pas de Supabase pour MVP
- **ASO niche FR sous-servi** : "wordle finance", "mot du jour finance", "puzzle bourse" → faible concurrence
- **Funnel UA gratuit** : screenshots viraux quand utilisateurs partagent leur grille emoji
- **Cross-promo organique** vers Alpha Terminal (audience overlap : finance + curieux + français)

---

Made with Claude Code × SmartLife — 2026
