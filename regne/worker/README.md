# worldstate-proxy

Cloudflare Worker qui proxie les requêtes IA vers Groq avec un quota par appareil
(stocké dans Cloudflare KV). Pas de clé côté client.

## Endpoint

`POST /v1/chat/completions` (forme OpenAI native)

Headers requis :
- `Content-Type: application/json`
- `X-Device-Id: <uuid>` (8-64 chars alphanum + tirets)

Whitelist de modèles : `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`.

Réponse `429` si quota atteint :
```json
{ "error": { "code": "quota_exceeded", "quota": 100, "used": 100, "reset": "..." } }
```

## Déploiement

```
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create QUOTA      # → coller l'id retourné dans wrangler.toml (id = "...")
npx wrangler secret put GROQ_API_KEY        # → coller la clé Groq depuis https://console.groq.com/keys
npx wrangler deploy                          # → noter l'URL retournée
```

Une fois déployé, copier l'URL (ex. `https://worldstate-proxy.<account>.workers.dev`)
dans la constante `FREEMIUM_PROXY_URL` de [`www/js/ai-client.js`](../www/js/ai-client.js).

## Dev local

```
npx wrangler dev
```

## Logs

```
npx wrangler tail
```

## Variables

- `DAILY_QUOTA` (var, valeur par défaut `"100"`) — quota journalier par appareil
- `GROQ_API_KEY` (secret) — clé Groq utilisée pour proxier
- `QUOTA` (KV binding) — namespace pour les compteurs `q:{deviceId}:{YYYY-MM-DD}`
