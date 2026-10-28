# Cloudflare Worker deployment

The project is configured as a Cloudflare Worker with Static Assets. `wrangler.jsonc` serves this repository's static files and routes `/api/*` to `worker/index.js`. Quotas use the persistent SQLite-backed `QuotaCounter` Durable Object; the v1 migration is declared in Wrangler config.

## Dashboard setup

1. In Cloudflare, open **Workers & Pages → qacrew-websites → Settings → Variables and Secrets**.
2. Add these as **secrets**: `ANTHROPIC_API_KEY`, `FORGE_LOGIN_PASSWORD`, and `SESSION_SECRET`. Leave `TURNSTILE_SECRET_KEY` unset while public try remains disabled; it is reserved for the optional Turnstile-protected route.
3. Add `FORGE_LOGIN_EMAIL` as a variable. Use a long random password. `SESSION_SECRET` must be a random value of at least 32 characters.
4. Add these as variables (or keep the defaults): `QUICK_MODEL=claude-sonnet-5`, `DEEP_MODEL=claude-opus-5`, and `ENABLE_PUBLIC_TRY=false`.
5. In **Builds & deployments**, set the deployment command to `npx wrangler deploy` (or configure the Git integration to deploy this Wrangler project). The first deploy applies the Durable Object migration.
6. Redeploy, then use the configured email and password at `/forge/app/`.

Do not put secrets in source code, GitHub, client-side config, or a committed `.env` file. For local development, copy `.env.example` to `.dev.vars` and fill it locally; `.dev.vars` is ignored by Git and excluded from Worker assets.

Cloudflare Workers HTTP requests can remain active while the client connection stays open; this Worker additionally aborts the Anthropic request after 125 seconds. The server-only `/api/public-try` route is present but returns 503 unless `ENABLE_PUBLIC_TRY=true`; it then requires a Turnstile token, quick scope, at most 1,500 input characters, and one persistent daily attempt per IP. No public-try UI is enabled.
