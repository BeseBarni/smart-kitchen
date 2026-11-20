# PrepPilot web client

From the repository root, run `pnpm dev` to start the workspace, or
`pnpm --filter @app/web-client dev` to run the web client. Open the displayed
local URL; `/` redirects to `/chat`.

Application pages require a Neon Auth session. Use email/password or Google to
sign in; sign-in redirects to `/chat`, and the account screen provides sign-out.
The Hono API checks sessions independently, including `/api/health`. Auth
endpoints and CORS preflights remain public. Signing in does not sync the demo
inventory, recipes, or chat.

The chat is a read-only demonstration. Messaging, quick prompts, camera, voice,
and recipe actions are unavailable. `/inventory` provides a mock-backed
fridge/freezer list with search, filters, add/edit, and portion controls;
decreasing the last portion removes the item. `/recipes` provides a mock-backed
recipe library with search, filters, and favorites. Recipe creation, details,
Cook & Stock, AI Rescue, and AI Autofill are unavailable; recipe stock labels
are illustrative and do not reflect the inventory. All data is illustrative and never synced or saved: mock state
is held in browser memory and resets on reload. Provisional feature contracts
will need alignment with future shared schemas and Hono endpoints.

The UI follows the PrepPilot Meal Assistant PWA Stitch project. Its narrative
design-system colors take precedence over the conflicting rendered screen
palette. The neutral app icon is a local placeholder, not an official logo.
The manifest supports standalone installation on compatible browsers; offline
support is not provided.

Run `pnpm typecheck` and `pnpm --filter @app/web-client build` from the root.

## Authentication setup

1. Use a disposable Neon development branch with Managed Better Auth enabled.
   The existing `neon.ts` declares `auth: true`. Managed Auth requires an AWS
   region and cannot be enabled on a project using IP Allow or Private
   Networking; do not disable those protections to make it work.
2. Set `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), and
   `NEON_AUTH_BASE_URL` for that same branch in the root `.env`. A linked
   branch's `neon deploy` provisions declared services and pulls their
   environment variables; review its effects before running it. Generate an
   independent random `NEON_AUTH_COOKIE_SECRET` of at least 32 characters,
   for example with `openssl rand -base64 32`, and add it to `.env`. Keep all
   credentials private; configure them separately in the hosting environment.
   Next loads the root `.env` locally without overriding existing variables.
3. Ensure Neon Auth is enabled before applying application migrations with
   `pnpm --filter @app/db db:migrate`. Review the migrations before applying
   them to an existing database: `0001_classy_menace.sql` deletes orphaned
   legacy auth users and changes user foreign keys.
4. Run `pnpm --filter @app/web-client dev`, open `http://localhost:3000`, and
   create an account or sign in. Email verification behavior depends on your
   Neon branch settings. Check sign-in, reload, sign-out, and that `/chat`
   redirects to `/auth/sign-in` after sign-out. Localhost ports are normally
   trusted by Neon; if disabled, enable localhost in Auth domain settings.

### Google sign-in

For development Neon provides shared Google credentials by default; the Google
consent screen shows Neon's branding. If needed, enable Google in the branch's
Auth configuration. For production, create your own Google Cloud OAuth **Web
application**, configure its consent screen and test users or publishing
status, and add this authorized redirect URI for each Neon branch:

```text
<NEON_AUTH_BASE_URL>/callback/google
```

Use the complete branch Auth URL, without a trailing slash. Enter the Google
client ID and secret in that branch's Neon Auth provider settings, not in this
repository. In Neon Auth's trusted domains, add each deployed app origin
(including scheme, without trailing slash); add preview origins as needed.
The provider redirect above is distinct from the app's post-login `/chat`
landing URL. See [Neon's OAuth guide](https://neon.com/docs/auth/guides/setup-oauth)
and [trusted domains guide](https://neon.com/docs/auth/guides/configure-domains).
Configure custom SMTP and other production settings before launch.

## Vercel AI SDK backend smoke test

The existing Vercel AI SDK integration uses the Google Gemini provider. Obtain
a Gemini API key from Google AI Studio and set `GOOGLE_GENERATIVE_AI_API_KEY`
or `GEMINI_API_KEY` in the root `.env`; this is **not** the Google OAuth client
secret. Both model tiers default to `gemini-3.5-flash-lite`; `AI_MODEL`,
`FAST_MODEL`, and `REASONING_MODEL` can override the corresponding model IDs.
Make sure your key has access and sufficient quota for the chosen models. The
default is a lightweight model rather than a Pro reasoning model; override
`REASONING_MODEL` if your workload needs a more capable model available to you.

The smoke test writes conversations, recipes, and inventory. Use only a
disposable development database and a dedicated existing Neon Auth user.
After signing in, obtain that user's ID from the Neon Auth console or a
trusted database query. From the repository root in PowerShell:

```powershell
$env:SEED_USER_ID = '<development-user-id>'
pnpm --filter @app/db db:seed
$env:AI_SMOKE_TEST_USER_ID = $env:SEED_USER_ID
$env:AI_SMOKE_TEST_ALLOW_MUTATIONS = 'true'
pnpm --filter @app/ai exec node --env-file=../.env --import tsx scripts/smoke-test.ts
```

The seed also writes sample data and uses fixed IDs, so it too belongs only on
a disposable branch. The AI command loads the root `.env` into its own Node
process; environment variables already set in the shell take precedence.
This tests the backend agent and real model calls, **not** the read-only chat
UI. A successful run ends with `Smoke test passed`; model access, network,
database, or nondeterministic model output can cause failures.
For per-minute quota limits, optionally set `AI_SMOKE_TEST_DELAY_MS=65000` to
pause between turns. This cannot bypass daily quotas or limits within a turn.
