# Openfeat

Hub regroupant 10 apps web sous un seul déploiement Vercel.

| Path | App | Tech | Description |
|---|---|---|---|
| [`/`](./index.html) | **Hub** | static | Page d'accueil avec liens vers les 10 apps |
| [`/alpha-terminal/`](./alpha-terminal/) | **Alpha Terminal** | PWA · BYOK | Terminal d'analyse financière IA, 46+ modules, 14 LLMs au choix |
| [`/motion/`](./motion/) | **Motion · Pace** | PWA | Tracker running (allure, splits, GPS, météo, hors-ligne) |
| [`/video/`](./video/) | **Montage AI** | PWA · ffmpeg.wasm | Pubs vidéo verticales générées dans le navigateur |
| [`/builder/`](./builder/) | **BuilderAi** | static · BYOK | Assistant marketing universel local-first |
| [`/cgv/`](./cgv/) | **LexiGen** | BYOK · Claude API | Génération CGV / Terms of Service en 4 étapes |
| [`/entrepreneuros/`](./entrepreneuros/) | **EntrepreneurOS** | landing | Page de présentation de l'app desktop |
| [`/goat-fuel/`](./goat-fuel/) | **GOAT FUEL** | static · offline | Générateur de screenshots Play Store / App Store |
| [`/sitecraft/`](./sitecraft/) | **SiteCraft** | landing/service | Service de création de sites web pour artisans/indépendants |
| [`/audit/`](./audit/) | **ConvertAudit** | static · BYOK | Audit IA de landing page (8 dimensions, score 0-100, plan d'action) |
| [`/devis/`](./devis/) | **SmartDevis Pro** | static · local-first | Génération devis / factures / acomptes, catalogue, historique, dashboard |

## Architecture

- **Monorepo statique** : chaque app vit dans son sous-dossier et est servie par Vercel sous son propre chemin.
- **`vercel.json` racine** : headers de sécurité, cache, COOP/COEP pour `/video/*` (requis par ffmpeg.wasm + SharedArrayBuffer).
- **Aucun build step** : tout est servi tel quel.

## BYOK (Bring Your Own Key)

Les apps qui appellent une LLM (Alpha Terminal, BuilderAi, LexiGen, Montage AI) demandent à l'utilisateur de saisir sa propre clé API. La clé est stockée dans `localStorage` du navigateur uniquement, jamais envoyée à un serveur tiers.

## Déploiement

1. Connecter le repo à Vercel
2. Framework: **Other**, Build command: *(vide)*, Output directory: *(vide)*
3. Pas de variables d'environnement requises (apps BYOK)

## Développement local

```bash
# Servir tout depuis la racine
npx serve .
# ou
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Notes par app

### Alpha Terminal
PWA financière complète. Les manifest paths sont relatifs pour fonctionner depuis `/alpha-terminal/`. Les liens absolus vers `https://alpha-terminal.app/...` (canonical, og:url) sont conservés mais peuvent être édités dans `index.html` pour pointer vers le domaine de déploiement effectif.

### Motion · Pace
Tracker running monolithique en un seul `index.html`.

### Montage AI (`/video/`)
Utilise `ffmpeg.wasm` avec multithreading → nécessite COOP/COEP activés (`vercel.json`). Le service worker a été adapté pour fonctionner sous le scope `/video/`.

### BuilderAi (`/builder/`)
App marketing en un seul `index.html`. BYOK via UI interne.

### LexiGen (`/cgv/`)
Initialement Electron, **convertie en web BYOK** :
- `byok-shim.js` reproduit le contrat `window.electronAPI` via `fetch` direct vers l'API Anthropic
- Streaming SSE
- Export DOCX = HTML compatible Word téléchargé en `.doc`
- Export PDF = `window.print()` avec stylesheet print dédié
- Modale de saisie de clé au premier usage

### EntrepreneurOS
Landing page seulement. L'app réelle est Electron (.dmg / .exe) — uploader les binaires sur GitHub Releases et linker depuis `entrepreneuros/index.html`.

### ConvertAudit (`/audit/`)
À l'origine déployée standalone sur `convertaudit.app`. Ses chemins absolus (`/favicon.png`, `/analyse.html`, `/manifest.json`…) ont été préfixés `/audit/` pour fonctionner sous le sous-chemin du hub. `audit/vercel.json` et `audit/_redirects` sont conservés à titre documentaire (non lus par Vercel — seul le `vercel.json` racine l'est).

### SmartDevis Pro (`/devis/`)
Initialement Electron (SmartDevis Pro v4.0). Seul `index.html` (web) est conservé ici — le bundle Mac (Frameworks/, MacOS/, Resources/, Info.plist) a été retiré : binaires >100 Mo non-pushables sur GitHub. Pour distribuer la version desktop, uploader le `.dmg` sur GitHub Releases et linker depuis ici.

## License

Voir chaque app pour son propre statut. Hub = MIT.
