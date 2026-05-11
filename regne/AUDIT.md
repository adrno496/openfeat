# AUDIT — Règne (Phase 0)

> Audit statique du code. Aucun fix appliqué — chaque finding est marqué `TODO`.
> Date : 2026-05-08. Périmètre : `www/js/*.js` (13 fichiers, ~5000 LOC), `www/css/styles.css`.

---

## Synthèse

| Sévérité | Compte |
|---|---|
| BLOCKER | 0 |
| MAJOR | 7 |
| MINOR | 9 |

**Top 3 risques :**

1. **Aucun timeout ni `AbortController` sur les fetch IA** ([ai-client.js:167,195,284](www/js/ai-client.js#L167)) — l'app peut se bloquer indéfiniment si le provider hang, et les requêtes orphelines continuent de tourner après abandon de partie.
2. **`localStorage.setItem` non protégé contre `QuotaExceededError`** ([storage.js:93,116](www/js/storage.js#L93)) — crash dur si le navigateur (Safari mobile, mode privé) refuse l'écriture.
3. **Tailles tactiles sous le seuil 44 px** : `.icon-btn` 36×36 ([styles.css:179](www/css/styles.css#L179)), `.secondary-btn` ~39px de hauteur — inconfortable sur mobile, en dessous des recommandations Apple HIG / WCAG 2.5.5.

**Bonne nouvelle :** la couche XSS est globalement saine. Toutes les interpolations IA → DOM inspectées passent par `escapeHtml` (format.js:120) ou `escapeHtmlSimple` (app.js:512), y compris les paragraphes streamés (`renderParagraphs` à [ui-consequence.js:150](www/js/ui-consequence.js#L150)). Pas de vecteur XSS confirmé.

---

## A. Audit technique

### A.1 — XSS / injection HTML

#### [MINOR] Vérifier le `title` HTML attribute des choix
- **Localisation** : [ui-game.js:232](www/js/ui-game.js#L232)
- **Description** : `title="${escapeHtml(c.description || '')}"` — OK, `escapeHtml` échappe les `"`. Vérifié sain.
- **Impact** : Aucun.
- **Recommandation** : Aucun changement. Noté pour conformité.
- **Statut** : ✅ vérifié sain

#### [MINOR] Données `style="--gauge-color:${g.color}"` non échappées
- **Localisation** : [ui-consequence.js:170](www/js/ui-consequence.js#L170)
- **Description** : `g.color` provient de `GAUGES` (constantes internes) — pas une donnée utilisateur. Sain par construction, mais fragile : si quelqu'un branche `GAUGES` sur des données externes, vecteur d'injection CSS.
- **Impact** : Nul aujourd'hui. Risque latent si refacto.
- **Recommandation** : Ajouter un commentaire `// GAUGES.color must be a literal hex` à la définition de GAUGES, ou valider via `/^#[0-9a-f]{3,8}$/i` à l'usage.
- **Statut** : TODO

### A.2 — Race conditions IA

#### [MAJOR] Aucun `AbortController` ni timeout sur les fetch
- **Localisation** : [ai-client.js:167](www/js/ai-client.js#L167), [ai-client.js:195](www/js/ai-client.js#L195), [ai-client.js:284](www/js/ai-client.js#L284) (streaming)
- **Description** : Les appels `fetch` n'ont ni `signal` ni timeout. Si le provider hang, l'app reste bloquée indéfiniment sur le spinner. Si l'utilisateur abandonne la partie pendant la génération, le fetch continue et son callback (`_streamCtrl.appendText`, `Storage.saveCurrentGame`, `Storage.addTokensUsed`) s'exécute sur un état déjà détruit.
- **Impact** : 1) UX bloquée sans recours autre que recharger l'app. 2) Tokens facturés sur une partie abandonnée. 3) Potentielle écriture sur l'état d'une nouvelle partie démarrée entre-temps (corruption de `_currentGameState`).
- **Recommandation** : Ajouter un `AbortController` partagé par appel, exposer un `cancelInFlight()` appelé par `navigate()` lors d'un changement de panel, et un timeout `setTimeout(() => ctrl.abort(), 30_000)`.
- **Statut** : TODO

#### [MAJOR] `_streamCtrl` global susceptible d'écrasement
- **Localisation** : [app.js:153](www/js/app.js#L153), [app.js:206](www/js/app.js#L206), [app.js:269](www/js/app.js#L269), [app.js:311](www/js/app.js#L311)
- **Description** : `_streamCtrl` est un singleton module-level. Une réponse IA tardive d'un choix N peut appeler `appendText` après que l'utilisateur soit revenu sur le panel `setup`. Le guard `if (_streamCtrl)` ne couvre pas le cas où `_streamCtrl` pointe vers un nouveau panel.
- **Impact** : Texte de la conséquence d'un règne abandonné peut s'afficher sur la nouvelle partie (très rare mais possible).
- **Recommandation** : Tagger chaque `_streamCtrl` avec un `streamId` (UUID), et que les callbacks vérifient `if (_streamCtrl?.id === capturedId)` avant d'agir. Lié au fix `AbortController`.
- **Statut** : TODO

#### [MINOR] `_isProcessingChoice` jamais reset si erreur avant le `try`
- **Localisation** : [app.js:155-227](www/js/app.js#L155)
- **Description** : Le flag est mis à `true` ligne 157 puis le `try/catch` couvre tout — actuellement OK. Mais aucun `finally` pour reset systématique. Une refacto qui déplace du code hors du try briserait l'invariant.
- **Impact** : Latent.
- **Recommandation** : Convertir en `try { … } finally { _isProcessingChoice = false; }`.
- **Statut** : TODO

### A.3 — Catch silencieux

#### [MINOR] 5 `catch {}` vides — review au cas par cas
- **Localisation** :
  - [ai-client.js:417](www/js/ai-client.js#L417), [ai-client.js:424](www/js/ai-client.js#L424) — probablement parsing JSON best-effort, OK mais ajouter `console.debug` aiderait au diag.
  - [ui-setup.js:58](www/js/ui-setup.js#L58), [ui-setup.js:67](www/js/ui-setup.js#L67) — `getCurrentGame()` et `getGameHistory()`. Si IndexedDB plante, l'utilisateur ne sait jamais pourquoi sa reprise n'apparaît pas.
  - [storage.js:282](www/js/storage.js#L282) — `sessionStorage.removeItem` (best-effort cleanup), OK silencieux.
- **Recommandation** : Remplacer par `catch (err) { console.warn('contexte:', err); }` minimum. Pour les deux dans `ui-setup`, afficher un toast discret si on perd la partie en cours.
- **Statut** : TODO

#### [MAJOR] Catches IA loguent mais ne donnent pas de feedback UI
- **Localisation** : [ai-narrator.js:349](www/js/ai-narrator.js#L349), [ai-narrator.js:500](www/js/ai-narrator.js#L500), [ai-narrator.js:552](www/js/ai-narrator.js#L552), [ai-narrator.js:590](www/js/ai-narrator.js#L590), [ai-narrator.js:671](www/js/ai-narrator.js#L671)
- **Description** : Quand l'IA échoue, le code retombe sur les fallback offline. Pas de signal visible à l'utilisateur que sa clé est cassée / quota dépassé / réseau down. Seul `loadEvent` ([ui-game.js:194](www/js/ui-game.js#L194)) fait remonter une vraie erreur.
- **Impact** : L'utilisateur croit jouer en mode IA premium alors qu'il est silencieusement basculé en démo. Mauvaise transparence — note : la Phase 2.4 du brief prévoit ce badge ⚡/📜.
- **Recommandation** : Propager un flag `fallback: true` (déjà fait partiellement) jusqu'à l'UI, afficher un toast "Connexion IA perdue" la première fois.
- **Statut** : TODO

### A.4 — Memory leaks / listeners

#### [MINOR] 48 `addEventListener` vs 0 `removeEventListener`
- **Localisation** : Globalement, mais critiques uniquement les suivants :
  - [app.js:27](www/js/app.js#L27) `document.addEventListener('regne:navigate')` — installé une fois dans `init()`. OK.
  - [app.js:532](www/js/app.js#L532) `document.addEventListener('DOMContentLoaded', init)` — one-shot. OK.
- **Description** : Tous les autres listeners sont attachés à des éléments enfants remplacés par `innerHTML` à chaque navigate → garbage-collectés en même temps que les nœuds. Pas de fuite réelle.
- **Impact** : Aucun aujourd'hui.
- **Recommandation** : Quand l'audio (Phase 6.4) ou les notifications (Phase 5.3) ajouteront des listeners `window`, prévoir un cleanup explicite. Documenter le pattern "tous les listeners enfants sont cleanup-by-replace".
- **Statut** : TODO (préventif futur)

#### [MINOR] `_eventLoaderTimer` / intervals — vérifier cleanup
- **Localisation** : `startEventLoader` / `stopEventLoader` dans [ui-game.js](www/js/ui-game.js)
- **Description** : Si l'utilisateur navigue hors du panel `game` pendant le chargement (via abandon, history, settings), `stopEventLoader()` n'est pas appelé.
- **Impact** : Léger, le timer tape sur un élément DOM remplacé (no-op).
- **Recommandation** : Appeler `stopEventLoader()` dans la phase de cleanup (ou via un guard `_currentPanel === 'game'`).
- **Statut** : TODO

### A.5 — État incohérent

#### [MINOR] `getCurrentGame()` sans null-check explicite
- **Localisation** : [app.js:43](www/js/app.js#L43), [ui-setup.js:60](www/js/ui-setup.js#L60)
- **Description** : Les deux usages utilisent `current && !current.ended` ou similaire — null-safe en pratique. Pas de bug.
- **Statut** : ✅ vérifié sain

#### [MINOR] `Storage.saveCurrentGame(_gameState)` sans vérifier que `_gameState` n'est pas null
- **Localisation** : [ui-game.js:214](www/js/ui-game.js#L214)
- **Description** : Si l'utilisateur abandonne pendant `await generateEvent()` et que `_gameState` est reset à null, on tente `saveCurrentGame(null)` qui va `removeItem` la partie courante — comportement défini mais surprenant.
- **Impact** : Trace : abandon mid-generation → la nouvelle partie peut perdre son état si le timing est très étroit (lié à la race condition A.2).
- **Recommandation** : Lié à la fix `AbortController` ; `if (!_gameState) return` après `await`.
- **Statut** : TODO

### A.6 — Robustesse stockage

#### [MAJOR] `localStorage.setItem` non protégé
- **Localisation** : [storage.js:93](www/js/storage.js#L93) (saveSettings), [storage.js:116](www/js/storage.js#L116) (saveCurrentGame), [storage.js:?](www/js/storage.js) (saveRecords si présent)
- **Description** : Aucun `try/catch`. `QuotaExceededError` (Safari mode privé, quota plein) ou `SecurityError` (cookies disabled) crashent l'app en plein gameplay.
- **Impact** : Crash silencieux ou bloquant, perte de la partie en cours.
- **Recommandation** : Wrapper toutes les écritures localStorage dans `try { … } catch (err) { console.error('Storage write failed:', err); /* surface via UI */ }`.
- **Statut** : TODO

#### [MINOR] `IndexedDB` indisponible (Safari mode privé) — fallback non testé
- **Localisation** : [storage.js:48](www/js/storage.js#L48) — `if (typeof indexedDB === 'undefined') return null;`
- **Description** : `openDB()` retourne null gracieusement, mais les appelants de `saveCompletedGame` / `getGameHistory` reçoivent `false` / `[]`. Pas de feedback UI : l'utilisateur croit que sa partie est sauvegardée alors qu'elle est perdue.
- **Impact** : Perte d'historique sur Safari mode privé.
- **Recommandation** : Détecter au boot et afficher une bannière "Mode privé : votre historique ne sera pas sauvegardé".
- **Statut** : TODO

#### [MAJOR] Aucune limite de taille / purge sur l'historique IndexedDB
- **Localisation** : [storage.js:128](www/js/storage.js#L128) (saveCompletedGame)
- **Description** : Pas de cap sur le nombre de parties stockées. Une partie compressée fait ~20-100 KB ; à 1000 parties, on est à ~50 MB en IDB. Note : la Phase 8.4 du brief liste cette purge comme TODO — elle n'existe pas aujourd'hui.
- **Impact** : Croissance illimitée sur le long terme.
- **Recommandation** : Cap à 50 parties, purge auto des plus anciennes (avec confirmation pour la première purge).
- **Statut** : TODO (Phase 8.4)

#### [MINOR] Compression `gzipString` sans fallback si CompressionStream indisponible
- **Localisation** : [storage.js:132](www/js/storage.js#L132)
- **Description** : `if (typeof CompressionStream !== 'undefined' && gameData.turns?.length > 5)` → fallback OK (stocke non compressé). Vérifié sain.
- **Statut** : ✅ vérifié sain

---

## B. Audit UX/UI

### B.1 — Tailles tactiles

#### [MAJOR] `.icon-btn` 36×36 px — sous le seuil 44 px
- **Localisation** : [styles.css:179](www/css/styles.css#L179)
- **Description** : 4 boutons utilisent cette classe dans le header de jeu (abandon, history, settings, audio futur). Hauteur 36px, sous WCAG 2.5.5 (44×44).
- **Impact** : Mauvaise précision tactile sur mobile, surtout en bas d'écran (zone du pouce).
- **Recommandation** : Passer à `width: 44px; height: 44px;` (ou `min-width/min-height`). L'icône 16px reste centrée.
- **Statut** : TODO

#### [MAJOR] `.secondary-btn` ~39 px de hauteur
- **Localisation** : [styles.css:144](www/css/styles.css#L144)
- **Description** : `padding: 12px 20px; font-size: 13px;` ≈ 12+12+15.6 ≈ 39.6px. Sous 44px.
- **Impact** : Idem, surtout pour le bouton "SOUMETTRE" du free-choice qui est crucial.
- **Recommandation** : `padding: 14px 20px;` ou `min-height: 44px;`.
- **Statut** : TODO

#### [MINOR] `.link-btn` 25 px (texte sous-ligné)
- **Localisation** : [styles.css:163](www/css/styles.css#L163)
- **Description** : `padding: 6px 8px; font-size: 13px;` ≈ 6+6+13 = 25px. Très sous 44px.
- **Impact** : Acceptable car "lien texte" et non bouton primaire ; mais "Vérifier la clé API" dans l'erreur IA ([ui-game.js:200](www/js/ui-game.js#L200)) en utilise — petit confort dégradé.
- **Recommandation** : `padding: 12px 8px;` pour les usages "action".
- **Statut** : TODO

### B.2 — Petits écrans (< 380 px)

#### [MINOR] Pas d'inspection visuelle réalisée — audit statique uniquement
- **Description** : L'audit n'inclut pas de test visuel à 360px. Risques probables (à valider lors d'une session avec dev server) :
  - Header de jeu ([ui-game.js:100](www/js/ui-game.js#L100)) : flag + nom + tour + 3 icon-btn sur une seule ligne → débordement probable.
  - Grille de choix `choices-grid` 2×2 ([ui-game.js:275](www/js/ui-game.js#L275)) : avec philo + label + flavor par carte, hauteur potentiellement importante.
  - Tableau des coûts settings ([ui-settings.js:190](www/js/ui-settings.js#L190)) : 3-4 colonnes, scroll horizontal nécessaire.
- **Recommandation** : Session dédiée avec `npx serve www/` + DevTools mobile à 360×640.
- **Statut** : TODO (manuel)

### B.3 — Feedback utilisateur

#### [MINOR] `alert()` natif utilisé pour validations
- **Localisation** : [ui-game.js:297](www/js/ui-game.js#L297) (free-choice trop court), [ui-setup.js:588](www/js/ui-setup.js#L588) (nom de pays), [ui-settings.js:220,232](www/js/ui-settings.js#L220) (erreurs API), [app.js:487](www/js/app.js#L487) (lien copié).
- **Description** : `alert()` casse l'immersion (boîte système Capacitor / WebView), bloque le thread, design incohérent.
- **Impact** : Sensation amateur dans un jeu narratif premium.
- **Recommandation** : Implémenter un système de toast / inline-error (existe déjà partiellement pour les erreurs de génération event). Cohérent avec Phase 6 polish.
- **Statut** : TODO

#### [MINOR] Erreur silencieuse côté `preloadNextEvent`
- **Localisation** : [app.js:292](www/js/app.js#L292)
- **Description** : `console.warn` mais pas de feedback. Si le préchargement échoue, l'utilisateur attendra (à raison) à son prochain choix.
- **Impact** : UX dégradée mais récupérable (loader normal s'affiche).
- **Statut** : Acceptable, pas de fix nécessaire.

#### [MINOR] Achievements unlocks — pas de toast
- **Description** : `evaluateAchievements` est appelé en fin de partie ([app.js:340](www/js/app.js#L340)) mais pas en cours. Aucun feedback live "Achievement débloqué".
- **Impact** : Manque de gratification immédiate.
- **Recommandation** : Phase 6 (polish) — toast au déblocage in-game.
- **Statut** : TODO (Phase 6)

### B.4 — Transitions

#### [MINOR] Aucune transition entre écrans
- **Localisation** : [app.js:72](www/js/app.js#L72) — `_root.innerHTML = …` remplace tout instantanément.
- **Description** : Cut sec entre setup/game/consequence/gameover.
- **Impact** : Sensation moins immersive. Cohérent avec Phase 6.1 du brief.
- **Recommandation** : Phase 6 — fade-in/slide-up via classe `.panel.entering` + `transitionend`.
- **Statut** : TODO (Phase 6)

---

## Annexe — Statistiques

| Métrique | Valeur |
|---|---|
| LOC JS total | ~5 084 |
| Fichiers JS | 13 |
| `addEventListener` | 48 |
| `removeEventListener` | 0 |
| `innerHTML =` | 36 |
| `catch` total | 26 |
| `catch {}` vides | 5 |
| `AbortController` | 0 |
| `try/catch` autour de `localStorage.setItem` | 0 |
| Tests passants (`test.mjs`) | 60+ (non re-vérifié dans cette phase, code non touché) |

### Fichiers inspectés en profondeur

- [www/js/app.js](www/js/app.js) — orchestration, streaming, lecture lignes 1-160, 200-296, 340-400
- [www/js/ai-client.js](www/js/ai-client.js) — multi-provider, lignes 1-300
- [www/js/storage.js](www/js/storage.js) — localStorage + IDB, lignes 1-220
- [www/js/ui-game.js](www/js/ui-game.js) — écran principal, lignes 95-305
- [www/js/ui-consequence.js](www/js/ui-consequence.js) — streaming render, lignes 60-186
- [www/js/format.js](www/js/format.js) — escapeHtml + helpers, complet
- [www/css/styles.css](www/css/styles.css) — boutons (113-195), tailles tactiles

### Fichiers inspectés en surface (greps + extraits)

- [www/js/ai-narrator.js](www/js/ai-narrator.js)
- [www/js/game-engine.js](www/js/game-engine.js)
- [www/js/ui-setup.js](www/js/ui-setup.js)
- [www/js/ui-settings.js](www/js/ui-settings.js)
- [www/js/ui-history.js](www/js/ui-history.js)
- [www/js/ui-gameover.js](www/js/ui-gameover.js)
- [www/js/ui-shared.js](www/js/ui-shared.js)

---

## Recommandations de priorisation pour la suite

Avant d'attaquer les phases 1-9 du brief, il est conseillé de traiter dans cet ordre :

1. **Storage hardening** ([storage.js](www/js/storage.js)) — 30 min : try/catch sur tous `localStorage.setItem`. Pré-requis silencieux à toute la méta-progression (Phase 1, 5).
2. **AbortController + timeout IA** ([ai-client.js](www/js/ai-client.js), [app.js](www/js/app.js)) — 2-3 h : élimine les races, débloque proprement les abandons. Pré-requis à tout enrichissement de boucle (Phase 3, 4).
3. **Tailles tactiles** ([styles.css](www/css/styles.css)) — 15 min : trois lignes CSS, gain perçu immédiat.
4. **Toast/inline error system** — 2 h : remplace tous les `alert()`. Brique réutilisée par Phase 6.

Ces quatre fixes représentent **~1 journée de travail** et assainissent la base avant les chantiers d'extension.
