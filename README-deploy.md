# Cloudflare Worker deployment

The project is configured as a Cloudflare Worker with Static Assets. `wrangler.jsonc` serves this repository's static files and routes `/api/*` to `worker/index.js`. Quotas use the persistent SQLite-backed `QuotaCounter` Durable Object. Paddle events and subscription access are stored in the `BILLING_DB` D1 database using the SQL migrations in `worker/migrations/`.

## Dashboard setup

1. In Cloudflare, open **Workers & Pages → qacrew-websites → Settings → Variables and Secrets**.
2. Add these as **secrets**: `ANTHROPIC_API_KEY`, `FORGE_LOGIN_PASSWORD`, and `SESSION_SECRET`. Leave `TURNSTILE_SECRET_KEY` unset while public try remains disabled; it is reserved for the optional Turnstile-protected route.
3. Add `FORGE_LOGIN_EMAIL` as a variable. Use a long random password. `SESSION_SECRET` must be a random value of at least 32 characters.
4. Add these as variables (or keep the defaults): `QUICK_MODEL=claude-sonnet-5`, `DEEP_MODEL=claude-opus-5`, and `ENABLE_PUBLIC_TRY=false`.
5. Ensure the Worker has the `BILLING_DB` D1 binding configured from `wrangler.jsonc`. Apply its schema with `npx wrangler d1 migrations apply qacrew-forge-billing --remote`.
6. In **Builds & deployments**, set the deployment command to `npx wrangler deploy` (or configure the Git integration to deploy this Wrangler project). The first deploy applies the Durable Object migration.
7. Redeploy, then use the configured email and password at `/forge/app/`.

The public read-only preview login is `demo@qacrew.it` / `qacrew2026`. It can browse examples but the Worker rejects document-generation requests for this account. Keep your configured `FORGE_LOGIN_EMAIL` and `FORGE_LOGIN_PASSWORD` private for production access.

## QAcrew Forge payment test (Paddle Sandbox)

The pricing page is at `/forge/pricing/`; test checkout is at `/forge/checkout/`. To enable checkout, add the Sandbox client-side token (`test_...`) as the Worker variable `PADDLE_CLIENT_TOKEN`. Keep `PADDLE_ENV=sandbox`. The public `/api/billing/config` endpoint returns that client token only when it has the Sandbox prefix and the environment is Sandbox; it never returns a Paddle API key. Do not add a live `live_...` token to this test flow.

Create a Paddle Sandbox notification destination at `https://www.qacrew.it/api/paddle/webhook`, subscribe it to `subscription.created`, `subscription.updated`, and `transaction.completed`, then save its endpoint secret as the Cloudflare Worker secret `PADDLE_WEBHOOK_SECRET`. The handler validates the `Paddle-Signature` HMAC against the unmodified raw request body and rejects timestamps older than five minutes. It deduplicates on Paddle `event_id` in D1. A signed checkout intent binds the `custom_data.userId` back to the currently authenticated Forge account; unauthenticated and demo checkouts cannot provision access.

`GET /api/forge/subscription?txn=txn_...` requires the same signed-in Forge account used at checkout. It returns `active: true` only after a verified subscription event has been stored with `active` or `trialing` status. The checkout completion callback redirects to `/forge/checkout/success/?txn=txn_...`; that page polls the subscription endpoint while the webhook arrives. Subscription plan is used for that account's generation quota; canceled, past-due, and paused subscriptions no longer grant the paid tier.

`FORGE_PLAN` controls the current single-workspace allowance (`starter`, `pro`, or `team`; defaults to `starter`). The Worker enforces 50, 250, or 1,000 generation requests per UTC calendar month, and Team allows at most five configured seats including the workspace owner. The current payment test does not automatically change `FORGE_PLAN` when Paddle checkout completes.

The six `priceId` values in `forge/checkout/checkout.js` must exist in the Paddle Sandbox catalog. Paddle's Sandbox and live catalogs are separate. Set the Sandbox default payment link to `https://www.qacrew.it/forge/checkout/`. The checkout's final localized amount and tax are determined by Paddle; the pricing-page currency choice is an estimate from the supplied price table.

This integration is Sandbox-only. Before enabling live charges, configure a separate live client token, live catalog price IDs, and a live notification destination/secret, then verify production checkout and legal purchase terms. Never mix Sandbox and live credentials.

Do not put secrets in source code, GitHub, client-side config, or a committed `.env` file. For local development, copy `.env.example` to `.dev.vars` and fill it locally; `.dev.vars` is ignored by Git and excluded from Worker assets.

Cloudflare Workers HTTP requests can remain active while the client connection stays open; this Worker additionally aborts the Anthropic request after 125 seconds. The server-only `/api/public-try` route is present but returns 503 unless `ENABLE_PUBLIC_TRY=true`; it then requires a Turnstile token, quick scope, at most 1,500 input characters, and one persistent daily attempt per IP. No public-try UI is enabled.
