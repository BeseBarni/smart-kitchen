# PrepPilot web client

From the repository root, run `pnpm dev` to start the workspace, or
`pnpm --filter @app/web-client dev` to run the web client. Open the displayed
local URL; `/` redirects to `/chat`.

Application pages require a Neon Auth session. Use email/password or Google to
sign in; sign-in redirects to `/chat`, and the account screen provides sign-out.
The Hono API checks sessions independently, including `/api/health`. Auth
endpoints and CORS preflights remain public. Inventory, recipes, and chat are
not linked to the account session.

The chat supports streamed messaging, saved conversations, automatic titles,
quick prompts and assistant-suggested replies. Structured recipes open in a
detail sheet with ingredients, instructions, save and cook/stock actions.
Chat recipe cards also provide quick save and cook/stock controls; stocking
requires an existing saved recipe and lets you choose portions and storage.
The Recipes menu uses the same detail sheet and retains edit, delete, and
cook/stock actions. Older recipe cards are restored when their structured tool
results are available; text-only historical answers remain unchanged.
Chat responses are buffered while streaming so recipe details cannot appear
inline before their cards; the full response remains available in the recipe
sheet, including any non-recipe information. Chat agents and recipe skills
receive the selected app language, and may show AI-generated progress messages
while working; a localized standard status is shown until one is available.
The chat menu opens a persistent shopping list; adding ingredients from a
recipe first compares inventory and asks you to review uncertain matches.
Rejected user messages are shown only in the current browser session and are
not stored in conversation history. Voice input is not currently available.
Receipt photos can be reviewed and imported into inventory with estimated
nutrition per recorded unit; uncertain nutrition remains unknown. Nutrition
estimates are not label measurements. When a user reports eating a clearly
identified amount of tracked food, chat deducts it and records a meal together;
ambiguous items or amounts require clarification. Unknown fiber does not block
chat consumption and remains unknown in the meal log.
AI-generated ingredients and recipes include estimated shelf life by storage
method when reasonably known. New inventory and cooked batches use an explicit
expiry date when supplied; otherwise they estimate it from the selected storage
method and preparation time (or the time the item is recorded). Estimates assume
fresh food and proper storage, are not safety guarantees, and do not update
existing records. Unsuitable or unknown storage methods remain unknown.
The shopping list requires the latest database migration;
review and apply it to the target database before using the feature.

Assistant messages, confirmation descriptions, recipe drafts, and saved AI
recipe descriptions and steps support GitHub-flavored Markdown. User messages
and manual recipes remain plain text. Raw HTML is not rendered, unsafe link
protocols are blocked, and Markdown images show alternative text without
loading external images.

The UI follows the PrepPilot Meal Assistant PWA Stitch project. Its narrative
design-system colors take precedence over the conflicting rendered screen
palette. The neutral app icon is a local placeholder, not an official logo.
Install PrepPilot using the browser's install or add-to-home-screen option on
localhost or HTTPS. After the first online visit, offline navigation shows a
reconnection page. Conversations, recipes, inventory, and API responses are
not cached or available offline.

Run `pnpm typecheck` and `pnpm --filter @app/web-client build` from the root.

## Vercel execution limit

The shared API route requests a 300-second function duration to accommodate
receipt vision processing and streamed chat. On Vercel this requires Fluid
Compute and a plan supporting that duration; verify the project settings
before deploying. The limit covers all API requests, not only receipt scans.
It does not guarantee completion if the AI provider or other dependencies are
slow or unavailable.

## Language

Choose English, Magyar, or Español in Account. The preference is stored in this
browser, survives sign-out, and is restored after hydration; the initial server
render may briefly appear in English. If storage is unavailable, the selected
language works for the current session and a warning explains that it may not
be saved. User-written and AI-generated content remains in its original
language. The offline page and install metadata use the selected language;
the browser or operating system may require a PWA update or reinstall before
an existing installed app's name changes. Offline and localized manifest assets
are generated from the dictionaries by the `predev` and `prebuild` scripts.

## Calories and meal tracker

The Calories tab reads live meal logs, inventory and profile targets through the
authenticated API. Daily totals use the device's local calendar day, including
daylight-saving transitions. Manual meals and meal-prep entries require fiber;
older records may have unknown fiber and are marked incomplete. Recipe fiber is
carried into cooked stock and meal logs. Before using these features, review and
apply `0003_tracker_fiber.sql` to the target database using the standard
migration workflow; test it on an isolated development branch first.
Receipt nutrition estimates also require `0004_green_wilson_fisk.sql` for
per-unit precision; review and test that migration on an isolated branch before
applying it to the target database.

Today's advisory suggestions are generated from available stock and dietary
preferences, including allergy information and dietary notes, using the
configured AI provider. This information is sent to that provider
automatically when today's tracker is opened. Suggestions do not reserve, consume or
log food. Fiber in suggestions is an estimate, and suggestions are not a
substitute for checking food safety and allergens. AI failures are displayed
with a retry control. The feature requires the same AI configuration as chat.
AI-proposed target changes are applied only after confirming the displayed
values in the chat.

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
