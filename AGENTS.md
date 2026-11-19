# Project Constitution & Agent Router

## Overview
Mobile-first AI Meal Prep & Fridge/Freezer Inventory PWA.
Designed with pragmatic enterprise boundaries so both the **frontend** (Next.js PWA -> React Native) and the **AI tools** (in-process -> standalone MCP server) can be decoupled without rewriting business logic.

## Approved Tech Stack (DO NOT introduce competing libraries)
- **Monorepo:** pnpm workspaces + Turborepo
- **Framework:** Next.js (App Router, TypeScript strict mode) — UI shell & single API adapter only
- **API Layer:** `hono`, `@hono/zod-validator` (with `hono/client` for type-safe frontend RPC)
- **Database & ORM:** PostgreSQL, `drizzle-orm`, `drizzle-kit`
- **Validation:** `zod` (single source of truth for API, Forms, AI Tools, and AI Skills)
- **AI Layer:** Vercel AI SDK (`ai`, `@ai-sdk/react`, provider SDKs); designed for future `@modelcontextprotocol/sdk` extraction
- **Server State:** `@tanstack/react-query` (caching, refetching, invalidation after AI mutations)
- **Client UI State:** `zustand` (lightweight ephemeral state: drawers, filters, active cooking timers)
- **Forms:** `react-hook-form` + `@hookform/resolvers/zod`
- **UI & Styling:** Tailwind CSS, `shadcn/ui`, `lucide-react`, `sonner` (toast notifications)

## Core Architectural Principles
1. **Frontend Replaceability:** `web-client/` is a thin, replaceable UI shell. NEVER use Next.js Server Actions for business logic. NEVER import server/business persistence layers inside React components. All data flow MUST go through the Hono HTTP API in `server/`.
2. **Single Source of Truth:** Business logic lives strictly in `modules/<domain>/*.service.ts`. Both REST endpoints (manual UI) and AI Tools call the exact same service methods.
3. **Result Pattern:** Services MUST NOT throw raw exceptions for expected domain errors. Return a typed `Result<T, AppError>` from `@app/shared/result`.
4. **MCP-Ready Tool Decoupling:** AI tool contracts MUST be framework-agnostic (zero Vercel AI SDK or Next.js imports inside tool definitions) so they can be exposed via a standalone MCP server post-V1.
5. **Strict Tool vs. Skill Separation:** Tools execute deterministic state mutations/queries. Skills are declarative, context-isolated reasoning/generation units with strict Zod input/output schemas.

## Directory Map
- `modules/` (`@app/modules`) — Domain vertical slices (`inventory/`, `recipes/`, `chat/`)
- `ai/tools/definitions/` — Framework-agnostic, MCP-ready tool contracts & handlers
- `ai/tools/adapters/` — Thin runtime adapters (V1: Vercel AI SDK; V2: MCP Server)
- `ai/skills/` — Declarative AI Skills (`*.skill.ts`)
- `ai/orchestrator.ts` — System prompt, guardrails, tool & skill orchestration
- `server/` (`@app/server`) — Framework-agnostic Hono REST API routes
- `db/` (`@app/db`) — Drizzle schema and Postgres connection
- `shared/` (`@app/shared`) — Shared types, `Result<T, E>`, error codes
- `web-client/` (`@app/web-client`) — Next.js PWA UI + catch-all Hono adapter (`app/api/[[...route]]/route.ts`)

## Workspace Import Conventions
- Use workspace package imports between workspaces:
  - `@app/shared`
  - `@app/db`
  - `@app/modules`
  - `@app/modules/schemas`
  - `@app/ai`
  - `@app/server`
  - `@app/web-client`

## Mandatory Context Loading
Before planning or writing code, you MUST read the relevant specification file:
- **Backend, DB, Schemas, or API changes:** Read `.agents/architecture.md`
- **AI, Prompts, Tools, MCP readiness, or Skills:** Read `.agents/ai-layer.md`
- **Any UI, Layout, Forms, State, or PWA changes:** Read `.agents/ui-pwa.md` (Requires **Stitch MCP**)

## Code Quality Rules
- Strict TypeScript: NO `any`, NO `as unknown as` hacks; explicit return types on exported functions.
- Keep files small and cohesive; prefer pure functions and composition over classes/inheritance.
