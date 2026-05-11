# Site de vente — Formations Claude Code FR

Site statique pour vendre le pack des 6 formations à 49 € via Lemonsqueezy.

## Structure

```
web/
├── index.html                          Landing principale (vente + download post-achat)
├── pages/
│   ├── guide-claude-code-francais.html
│   ├── mcp-server-tutorial.html
│   ├── skills-claude-code-tutorial.html
│   ├── sub-agents-claude-code.html
│   ├── claude-code-vs-cursor.html
│   └── claude-md-exemples.html
├── assets/
│   ├── styles.css                      CSS unique (mobile-first, dark theme)
│   └── checkout.js                     Intégration Lemonsqueezy + révélation download
├── dist/
│   └── formations-claude-code.zip      Le ZIP livré à l'acheteur (~747 KB)
├── sitemap.xml                         Pour Google Search Console
├── robots.txt
└── README.md                           (ce fichier)
```

## Configuration Lemonsqueezy (à faire avant prod)

### 1. Créer le produit
- Compte Lemonsqueezy → Store → New Product
- Nom : "Formations Claude Code FR — Pack complet"
- Type : **Single payment** (pas subscription)
- Prix : **49.00 EUR**
- Description : 6 formations en français + templates + MCPs prêts à l'emploi

### 2. Configurer le checkout
- Cocher "Enable overlay checkout" pour utiliser Lemon.js
- Redirect URL après achat : `https://formations-claude-code.fr/?order_id={order_id}`
- Cette redirect avec `order_id` déclenche automatiquement le download via `checkout.js`

### 3. Récupérer l'URL de checkout
- Dans le produit → Variants → "Share → Checkout link"
- Copier l'URL au format `https://TONSTORE.lemonsqueezy.com/checkout/buy/UUID`

### 4. Mettre à jour `assets/checkout.js`
Remplacer la ligne :
```js
const LEMON_CHECKOUT_URL = 'https://REPLACE_ME.lemonsqueezy.com/checkout/buy/REPLACE_VARIANT_ID'
```
par ton URL réelle.

### 5. (Recommandé) Attacher le ZIP côté Lemonsqueezy aussi
Lemonsqueezy peut héberger le ZIP et l'envoyer par email après achat. Va dans Product → Files → Upload `dist/formations-claude-code.zip`. L'acheteur reçoit alors le lien par email **et** par redirection sur ton site.

## Déploiement

### Option A — Vercel (recommandé)
```bash
cd web/
vercel --prod
```
Configurer le domaine custom (ex `formations-claude-code.fr`) dans Vercel dashboard.

### Option B — Netlify
```bash
cd web/
netlify deploy --prod --dir .
```

### Option C — Cloudflare Pages
Connecter le repo GitHub, build command vide, publish directory `web/`.

### Option D — Self-host
Serveur statique simple (Caddy, nginx) servant le dossier `web/`.

### Headers HTTP recommandés (vercel.json à créer si Vercel)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' https://app.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.lemonsqueezy.com; img-src 'self' data: https:; frame-src https://*.lemonsqueezy.com;" }
      ]
    }
  ]
}
```

## Mises à jour du contenu

Quand le ZIP des formations est mis à jour :
```bash
# Depuis la racine du projet
zip -r dist/formations-claude-code.zip . \
  -x "skill/*" -x ".claude/*" -x "web/*" -x "dist/*" \
  -x "*.DS_Store" -x "*.zip" -x "node_modules/*" -x ".git/*" -q

cp dist/formations-claude-code.zip web/dist/
```

Puis re-deploy.

## Test local

```bash
cd web/
npx serve .
# ouvre http://localhost:3000
```

Tester le flux complet :
1. Page d'accueil charge correctement
2. Cliquer "Acheter" ouvre l'overlay Lemonsqueezy (après config réelle)
3. Simuler le retour post-achat : ouvrir `http://localhost:3000/?order_id=test123` → la zone download apparaît
4. Cliquer "Télécharger" télécharge le ZIP

## SEO checklist

- [x] Title + meta description optimisés sur chaque page
- [x] H1 unique par page
- [x] Schema.org Product (landing) + TechArticle (pages SEO) + BreadcrumbList
- [x] Open Graph + Twitter Cards
- [x] Canonical URL sur chaque page
- [x] sitemap.xml + robots.txt
- [x] Mobile-first responsive
- [x] Pages internes interlinkées (footer + CTA)
- [ ] À faire après déploiement : Google Search Console + soumission sitemap
- [ ] À faire après déploiement : ouvrir un compte Plausible / Umami pour tracker conversion (privacy-first, pas de bandeau cookies)

## Conformité légale (à compléter avant prod)

Page mentions légales, CGV, politique de confidentialité — à rédiger ou faire rédiger par avocat.
Cf. `LEGAL-NOTES.md` à la racine du dépôt formations pour les points obligatoires.

Liens dans le footer pointent vers `#` actuellement → à remplacer par les vraies pages.
