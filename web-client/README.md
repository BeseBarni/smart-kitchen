# PrepPilot web client

From the repository root, run `pnpm dev` to start the workspace, or
`pnpm --filter @app/web-client dev` to run the web client. Open the displayed
local URL; `/` redirects to `/chat`.

The chat is a read-only demonstration. Messaging, quick prompts, camera, voice,
and recipe actions are unavailable. `/inventory` provides a mock-backed
fridge/freezer list with search, filters, add/edit, and portion controls;
decreasing the last portion removes the item. AI Rescue, AI Autofill, and Recipes
are unavailable. All data is illustrative and never synced or saved: mock state
is held in browser memory and resets on reload. Provisional feature contracts
will need alignment with future shared schemas and Hono endpoints.

The UI follows the PrepPilot Meal Assistant PWA Stitch project. Its narrative
design-system colors take precedence over the conflicting rendered screen
palette. The neutral app icon is a local placeholder, not an official logo.
The manifest supports standalone installation on compatible browsers; offline
support is not provided.

Run `pnpm typecheck` and `pnpm --filter @app/web-client build` from the root.
