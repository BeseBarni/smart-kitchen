# PrepPilot web client

From the repository root, run `pnpm dev` to start the workspace, or
`pnpm --filter @app/web-client dev` to run the web client. Open the displayed
local URL; `/` redirects to `/chat`.

The account button opens Neon Auth email/password sign-in and sign-up. Account
details are read through the Hono API from Neon Postgres. This does not sync or
protect the demo inventory, recipes, or chat.

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

## Neon configuration

`neon deploy` writes `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and
`NEON_AUTH_BASE_URL` to the root `.env`. Add a random
`NEON_AUTH_COOKIE_SECRET` of at least 32 characters (for example with
`openssl rand -base64 32`). Keep these values private and set them in the
hosting environment as well. The Next.js config loads the root `.env` for
local development without overriding already-set environment variables.
Application queries use the pooled URL; Drizzle migrations use the unpooled
URL. Use `http://localhost` for local Auth; the origin must be trusted by Neon.
Configure production trusted domains and custom SMTP before production use.
