# PrepPilot web client

From the repository root, run `pnpm dev` to start the workspace, or
`pnpm --filter @app/web-client dev` to run the web client. Open the displayed
local URL; `/` redirects to `/chat`.

The chat is a read-only demonstration. All messages, inventory actions, stock
counts, and recipe details are examples: nothing is synced or saved. Messaging,
quick prompts, camera, voice, other navigation destinations, and recipe actions
are unavailable. The mock API holds data only in the current browser session and
resets on reload; its provisional contracts will need alignment with future
shared chat schemas and Hono endpoints.

The UI follows the PrepPilot Meal Assistant PWA Stitch project. Its narrative
design-system colors take precedence over the conflicting rendered screen
palette. The neutral app icon is a local placeholder, not an official logo.
The manifest supports standalone installation on compatible browsers; offline
support is not provided.

Run `pnpm typecheck` and `pnpm --filter @app/web-client build` from the root.
