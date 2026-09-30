# Intégration caisse (Lightspeed) — Work for All Smart Stock

## Contenu
- `lib/pos/crypto.mjs` : chiffrement AES-256-GCM des jetons.
- `lib/pos/normalize.mjs` : format de vente commun.
- `lib/pos/lightspeed.mjs` : connecteur générique (variante via `LIGHTSPEED_VARIANT`), pagination, échange OAuth.
- `lib/pos/syncEngine.mjs` : synchro idempotente, statuts SUCCESS / PARTIAL / FAILED, produits à associer.
- `lib/pos/webhook.mjs` : validation HMAC, déduplication, protection cron.
- `app/api/pos/webhook` et `app/api/cron/pos-sync` : routes Next.js.
- `tests/pos/` : tests avec faux serveur Lightspeed. Lancer : `node --test tests/pos/`.

## Variables d'environnement (noms uniquement)
POS_ENCRYPTION_KEY, LIGHTSPEED_VARIANT, LIGHTSPEED_API_BASE_URL, LIGHTSPEED_TOKEN_URL, LIGHTSPEED_CLIENT_ID, LIGHTSPEED_CLIENT_SECRET, LIGHTSPEED_ACCESS_TOKEN, LIGHTSPEED_WEBHOOK_SECRET, CRON_SECRET, DATABASE_URL.

## Reste à faire
1. Adaptateur Prisma (modèles : identifiants externes uniques, ventes traitées, journal webhooks) remplaçant le store mémoire.
2. Écran Réglages → Connexion caisse, historique, « Produits à associer ».
3. Cron 00:00 chez l'hébergeur : `GET /api/cron/pos-sync` avec `Authorization: Bearer $CRON_SECRET`.

## BLOCKED (externe)
Variante Lightspeed du Repaire — Cernier Centre, Client ID/Secret, URL de redirection OAuth, secret webhook, hébergeur.
