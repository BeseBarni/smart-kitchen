---
applyTo: "modules/**,server/**,db/**,shared/**"
---

# Backend & Domain Architecture Rules

## Modular Monolith (Vertical Slices)

Each business domain under `modules/<domain>/` (e.g., `inventory`, `recipes`, `chat`) MUST follow this structure:

- `<domain>.schema.ts` — Zod schemas for inputs, outputs, and DTOs. Add `.describe()` to fields so schemas can be reused directly by forms, API docs, and MCP/AI tools.
- `<domain>.repo.ts` — Pure Drizzle ORM database queries. No business rules, no HTTP status codes.
- `<domain>.service.ts` — Pure business logic. Calls `.repo.ts`, enforces invariants, and returns `Result<T, AppError>`.

## Error Handling (Result Pattern)

- Use `ok(data)` and `err({ code, message, details? })` from `shared/result.ts`.
- Define explicit domain error codes (e.g., `ITEM_NOT_FOUND`, `INSUFFICIENT_PORTIONS`, `VALIDATION_ERROR`, `CONFLICT`).
- Never throw exceptions for expected business rule violations. Let only unexpected infrastructure failures (DB unreachable, timeouts) bubble up to Hono's global `onError` middleware.

## API Layer (`server/`)

- Build all endpoints with **Hono** under `server/routes/<domain>.routes.ts` and compose them in `server/index.ts`.
- Validate all inputs (`json`, `query`, `param`) using `@hono/zod-validator` with schemas imported from `modules/<domain>/*.schema.ts`.
- Map `Result` error codes to proper HTTP status codes (`400`, `404`, `409`, `422`) in route handlers.
- Chain Hono route definitions and export `export type AppType = typeof app` so the frontend gets end-to-end type safety via `hono/client`.
- `web-client/app/api/[[...route]]/route.ts` MUST only export `GET`, `POST`, `PUT`, `PATCH`, `DELETE` handlers delegating directly to `handle(app)` from `hono/vercel`.

## Database (`db/`)

- Define all PostgreSQL tables, enums, and relations in `db/schema.ts` using Drizzle ORM.
- Use `uuid` primary keys (`defaultRandom()`) and `createdAt` / `updatedAt` timestamps on all core tables.
- Manage schema changes exclusively via `drizzle-kit` migrations.
- Keep DB connection pooling clean and serverless-safe in `db/index.ts`.

## Workspace Import Conventions

- Prefer workspace package imports over relative cross-package paths:
  - `@app/shared`
  - `@app/db`
  - `@app/modules`
  - `@app/modules/schemas`
  - `@app/server`
