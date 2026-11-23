# Smart Kitchen Monorepo Structure Report

**Reviewed:** 2026-11-23
**Scope:** Current source tree and package manifests. Generated output, dependency trees, local environment files, and caches are excluded.

## 1. Project at a glance

Smart Kitchen (PrepPilot) is a pnpm/Turborepo monorepo for a mobile-first meal-prep, food-inventory, and budget PWA. Its runtime is split into six workspaces:

| Workspace | Package | Responsibility |
| --- | --- | --- |
| `shared/` | `@app/shared` | Cross-cutting types, typed errors/results, and shelf-life utilities. |
| `db/` | `@app/db` | PostgreSQL connection, Drizzle schema, migrations, and seed scripts. |
| `modules/` | `@app/modules` | Domain schemas, repositories, and business services. |
| `ai/` | `@app/ai` | Agent orchestration, deterministic tool definitions, structured AI skills, and SSE event types. |
| `server/` | `@app/server` | Authenticated Hono HTTP API that calls domain services and the AI runner. |
| `web-client/` | `@app/web-client` | Next.js PWA shell, feature UI, API client, and the Hono-to-Next adapter. |

The dependency direction is intended to keep UI and framework adapters replaceable: the web client calls the Hono API; API routes and AI tools call the same domain services; services use Drizzle repositories and `@app/shared` results. Zod schemas are shared between the API and AI contracts.

At the repository root, `pnpm-workspace.yaml` defines the workspace set, `turbo.json` defines task ordering/caching, and the root scripts provide `dev`, `build`, `lint`, and `typecheck`. The `neon.ts` configuration declares Neon Auth and a seven-day TTL policy for newly created non-default branches.

## 2. Runtime architecture and request flow

### Standard API request

1. The Next catch-all API route at `web-client/app/api/[[...route]]/route.ts` delegates HTTP methods to `handle(app)` from Hono.
2. `server/index.ts` mounts the API under `/api`, configures CORS and the global error handler, and composes the route groups.
3. Protected route handlers use `requireAuth`, validate path/query/body data with Zod validators, call `@app/modules` services, and map `Result<T, AppError>` to HTTP responses.
4. Domain services enforce rules and return typed results. Repositories perform Drizzle queries; expected domain errors are represented as `AppError`, while unexpected infrastructure errors reach the API error handler.

### Chat and agent turn

1. The client `useChatStream` hook posts either to `/api/chat` (which can create a conversation) or `/api/conversations/:id/stream`. It sends the selected locale and either uploaded-asset IDs or inline image data.
2. `chat.routes.ts` authenticates and validates the request, then calls `runStreamingTurn` in `ai/runner.ts`. The response is an SSE stream, with the conversation ID also exposed in a response header.
3. Before model work, the runner confirms uploaded media, verifies ownership and image type, loads recent context, and applies the kitchen-domain and kitchen-safety classifiers. Accepted user messages are persisted.
4. If there are images, the vision extractor first receives structured image/context input. Its result and usage are recorded as a skill execution. A receipt result is enriched and emitted as a review card; this is a preview, not a receipt commit.
5. The orchestrator loads profile, inventory summary, and recent conversation items. It constructs a guarded system prompt and runs the model/tool loop. Historical text and saved vision output are converted to model messages; tool/skill calls are also retained in the conversation ledger.
6. SSE events report agent status, incremental assistant text, tool start/completion, skill completion, UI directives, errors, and turn completion. The final assistant message, directives, token usage, and latency are persisted.
7. The client validates each parsed SSE payload against `agentStreamEventSchema`, updates the live turn UI, invalidates the relevant TanStack Query domains when directives request it, and refreshes conversation data after the stream ends.

## 3. AI agents, skills, and tool calls

### Agent model

Agents are `SubAgent` implementations that share an `AgentContext`: user/conversation IDs, locale, abort signal, event emitter, usage counters, and the conversation-ledger writer. Specialist agents are invoked through the orchestrator as tools, so their work has a bounded request and its result is returned to the caller.

| Agent | Role and tool scope |
| --- | --- |
| `orchestrator` | User-facing coordinator. Loads profile, inventory, and recent messages; streams the user-facing answer; delegates specialized tasks and emits UI actions. |
| `inventory_ops` | Inventory reads and mutations, consumption/meal logging, and cooked-batch stocking. Also has recipe lookup/cook tools, tags, and TheMealDB image search. It is instructed to distinguish eating (consume and log) from quantity adjustment and to require confirmation for discard or other consequential changes. |
| `recipe_architect` | Recipe lookup, draft generation, nutrition/cost estimation, expiring-food rescue, approved recipe saves, and recipe-card presentation. Uses the reasoning model tier and narrowly scoped skills. |
| `kitchen_advisor` | Read-only answers using inventory, expiry, profile, meal totals, and saved-recipe tools. It has no mutation tools. |
| `budget_agent` | Spending queries, receipt reading, manual expense/budget changes, reviewed receipt commits, and budget summary presentation. It is instructed not to commit a scanned receipt without explicit user intent. |
| `vision_extractor` | A stream status/event identity rather than a `SubAgent` in the same sense as the four domain specialists. `runStreamingTurn` calls the extractor directly for attached images. |

### Orchestrator delegation tools

`orchestratorTools()` creates four delegation tools plus direct profile/UI tools:

- `delegate_to_inventory_ops`: delegates stock lookup, consumption, stock changes, or cooked-batch stocking.
- `delegate_to_recipe_architect`: delegates recipe design, rescue, lookup, or save. For save mode, the orchestrator checks that a `recipes_create` result contains an ID and exact title; otherwise it returns a validation failure rather than treating a draft as saved.
- `delegate_to_kitchen_advisor`: read-only kitchen questions.
- `delegate_to_budget_agent`: budget and spending work.
- `profile_update_targets`: proposes nutrition target changes through a confirmation UI path.
- `ui_request_confirmation`, `ui_present_recommendations`, and `ui_present_receipt_import`: request confirmation or present structured UI. Receipt presentation is normally produced by the runner’s image path, which suppresses a duplicate receipt card.

The orchestrator prompt also encodes dependencies and authorization constraints: dependent actions wait for identifiers from earlier actions; an explicit report of clearly identified food eaten authorizes consumption and meal logging; uncertain quantities require clarification; recipe drafts are not saved recipes; and receipt commits require an explicit request.

### Deterministic tool catalogue

Tool definitions live under `ai/tools/definitions/`. They describe the LLM-facing action, Zod input (and, where declared, output) validation, annotations such as read-only/destructive/idempotent hints, service execution, cache invalidation domains, and optional UI-directive mapping.

| Group | Tool names | Typical effect |
| --- | --- | --- |
| Inventory reads | `inventory_list`, `inventory_get_summary`, `inventory_list_expiring` | Query stock, totals, or expiring items. |
| Inventory writes | `inventory_add_item`, `inventory_add_batch`, `inventory_adjust_quantity`, `inventory_consume_portion`, `inventory_discard_item` | Add or change stock. Consumption uses the inventory service operation that also logs a meal. |
| Recipes | `recipes_list`, `recipes_get_detail`, `recipes_create`, `recipes_cook_and_stock` | Search/read saved recipes, save an approved recipe, or create stock from a saved recipe. |
| Ingredients | `ingredients_search`, `ingredients_create` | Find or create ingredient catalogue records. |
| Context | `profile_get`, `meal_logs_get_daily_summary`, `profile_update_targets` | Read dietary/profile and meal context or propose nutrition-target changes. |
| Budget and receipts | `budget_get_monthly_summary`, `budget_list_receipts`, `budget_get_receipt_detail`, `budget_log_expense`, `budget_update_monthly_limit`, `budget_commit_scanned_receipt` | Read spend/receipts or write budgets and reviewed receipt data. |
| Tags and images | `tags_list_available`, `media_search_themealdb_images` | Reuse available tag slugs and find normalized meal/ingredient image candidates. |
| UI-only tools | `ui_present_recipe_draft`, `ui_request_confirmation`, `ui_present_recommendations`, `ui_present_receipt_import`, `ui_present_budget_summary` | Return structured display directives without domain mutation. |
| Agent progress | `report_progress` | Added by the common agent loop; streams a short model-generated progress label. |

The definitions call service methods instead of owning business rules. In particular, inventory and recipe mutations map successful results into UI cards; tool metadata names affected domains so the web client can invalidate queries. UI-only tools return validated data that the adapter turns into directives.

### Tool execution lifecycle

`runAgentLoop()` adapts each `ToolDefinition` to the Vercel AI SDK tool shape. For each model tool call, `executeToolCall()`:

1. Emits `agent_status` (`running_tool`) and `tool_call_started`.
2. JSON-normalizes and validates the arguments, then appends a `tool_call` ledger item.
3. Runs the definition, whose `defineTool()` wrapper validates input and converts expected service failures to `{ success: false, error }`.
4. Appends a corresponding `tool_result` ledger item, preserving either JSON-safe output or the error.
5. Emits a UI directive when the tool has a mapper and succeeded, then emits `tool_call_completed`.
6. Returns a JSON-serialized outcome to the model so it can continue or explain a failure.

Unexpected exceptions are recorded as failed tool results and then rethrown, allowing the agent loop’s normal error path to surface them instead of presenting a success-shaped response. The loop streams text when configured, adds the locale reminder, and caps tool iteration at 20 steps; at the limit it disables further tools and asks for a factual summary of confirmed results.

### Skills

Skills are structured generation workflows, not deterministic state-changing tools. `defineSkill()` validates input, sends only its supplied structured context to the model, requests schema-conforming output, includes the selected-language reminder, tracks latency/usage, and emits skill status events. The recipe agent wraps relevant skills as tools and writes their input/output to the conversation ledger.

- `meal-prep-architect.skill.ts`: creates batch-cookable recipes with ingredients, steps, estimated per-serving macros/cost, tags, and storage/shelf-life guidance.
- `fridge-rescue.skill.ts`: ranks up to three plans that prioritize expiring food and respect dietary preferences.
- `nutrition-cost-estimator.skill.ts`: estimates per-serving macros and cost from supplied known values and reports confidence.
- `daily-meal-suggestions.skill.ts`: creates advisory daily meal suggestions from stock, dietary preferences, targets, and consumed totals; it is not a reservation or logging operation.
- `vision-extractor.skill.ts`: classifies attached images into receipt, prepared dish, fridge/pantry items, nutrition label, or other, with strict structured schemas. It also exposes a narrower receipt-preview extraction path.

### Runtime and MCP boundary

`ai/core/llm.client.ts` centralizes model selection, structured generation and streaming. The current provider implementation constructs the Google Generative AI provider; fast/reasoning/vision model IDs are configurable with defaults. `ai/core/sse.encoder.ts` encodes typed events as SSE frames.

The V1 adapter present is `ai/tools/adapters/vercel.adapter.ts`. Tool definitions are separated from the Vercel adapter, but no MCP adapter/server implementation was found in the current source tree; MCP support remains a future extraction target rather than a present runtime.

## 4. Domain modules (`modules/`)

`modules/` is one workspace package with domain slices. Schemas define validated inputs/DTOs, repositories encapsulate database access, and services implement business operations and return shared `Result` values.

| Domain slice | What it does |
| --- | --- |
| `account/` | Reads account information associated with an authenticated user. |
| `budget/` | Monthly budgets and category limits; expense categories and merchant normalization; receipt read/write operations; receipt scanning enrichment and reviewed scan commits. Receipt and inventory writes can be coordinated transactionally. |
| `chat/` | Conversations, titles, ordered conversation items, recent context, assistant/tool/skill ledger persistence, history mapping, and importing reviewed receipt directives. |
| `ingredients/` | User-scoped ingredient catalogue list/search/read/create/update/delete and ID lookup. |
| `inventory/` | Stock CRUD and batch creation, summaries, expiry queries, storage switching, quantity adjustment, discard, and consumption. Consumption connects inventory deduction with meal logging. |
| `meal-logs/` | Manual meal records, daily summaries, filtered history, and deletion. |
| `meal-suggestions/` | Builds structured suggestion context and validates generated plans against supplied domain context. |
| `mealdb/` | TheMealDB client/service and image-name/URL normalization helpers for meal and ingredient images. |
| `media/` | Upload lifecycle, ownership checks, readable URLs, object retrieval, deletion, and cleanup, backed by an S3-compatible client. |
| `profile/` | Creates/reads/updates dietary preferences and nutrition targets; profile updates can synchronize the auth user image. |
| `recipes/` | Recipe CRUD and mapping, ingredient associations, cooking saved recipes into inventory batches, and tokenized public sharing. |
| `shared/` | Shared domain helpers, numeric operations, and authenticated-user existence checks used across slices. |
| `shopping/` | Shopping-list reads/adds/removal and comparison/matching of requested items against available items. |
| `tags/` | Lists available canonical/user tags, normalizes slugs, resolves or creates tags, and associates them with recipes and ingredients. |

`modules/schemas.ts` re-exports domain schemas and provides a `schemaCatalog`; the package root exports domain service namespaces and related shared DTO/schema types.

## 5. Other backend workspaces

### `db/` — persistence

The Drizzle schema is composed from `db/schema/`: enums, users, food/ingredients/recipes, inventory, shopping, conversations, tags, media, expense categories, merchants, receipts, budgets, and relations. `db/index.ts` lazily initializes a serverless-oriented Postgres.js connection and exports the typed Drizzle database. `db/migrations/` contains migrations `0000` through `0011` and their Drizzle metadata; `0011` adds recipe-share tokens and has been applied to the linked Neon branch. `seed.ts` and `seed-budget.ts` provide development seed workflows.

### `server/` — HTTP API

`server/index.ts` composes the Hono app, CORS, and centralized error mapping. `middleware/` supplies Neon Auth session verification and `Result`-to-HTTP mapping. Route groups cover auth, account, health, profile, media, ingredients, recipes, inventory, shopping, meal logs, meal suggestions, tags, TheMealDB, merchants, receipts, budget, and chat. The app exports `AppType` for typed client usage. Most domain endpoints authenticate and validate request data before calling a service; chat stream routes additionally return SSE.

### `shared/` — common contracts

`Result<T, E>` supplies `ok`/`err` and narrowing helpers. `errors.ts` defines the cross-app error codes; `types.ts` carries shared app types; `shelf-life.ts` computes an estimated expiry only when a positive finite duration is known. This package is the common contract layer for modules, API, and AI.

## 6. Frontend workspace (`web-client/`)

The Next.js App Router is the PWA shell and API adapter, not the business-logic layer. `(pwa)/layout.tsx` wraps authenticated product pages in `AppShell`; root layout initializes providers, metadata, viewport, and global styles. The API catch-all forwards to Hono.

### Pages and feature slices

Current product routes include account, budget, chat, inventory, recipes, and tracker under `app/(pwa)/`; auth sign-in is separate. The features are organized as follows:

| Feature | Main responsibility |
| --- | --- |
| `features/account/` | Account/profile form and authentication-facing account view. |
| `features/budget/` | Monthly budget overview, receipt feed/detail/import/edit, merchants/categories, receipt scanning and mutations. |
| `features/chat/` | Conversation UI, stream handling, messages/attachments, tool progress, UI directive rendering, recipe and receipt cards, and shopping-list entry points. |
| `features/inventory/` | Inventory query/mutation facade, item list/detail, storage and freshness display, filters, forms, and local UI state. |
| `features/meal-tracker/` | Daily meal totals, targets, manual/stock-based meal logging, and suggestions. |
| `features/media/` | TheMealDB stock-image search and candidate selection. |
| `features/recipes/` | Recipe list/detail/edit/cook flows, query cache, mocks, and UI state. |
| `features/settings/` | Settings and language selection. |
| `features/shopping/` | Shopping-list sheet and review/matching UI. |

Feature slices generally co-locate API facades, query keys, hooks, components, utility functions, and Zustand UI state. Shared `components/` contains layout, UI primitives, providers, and media/markdown components; shared `lib/` contains the API client, localization, media utilities, optimistic/cache helpers, and cross-domain invalidation. English, Hungarian, and Spanish dictionaries live in `lib/i18n/dictionaries/`; scripts generate localized PWA assets. Public assets include manifests, service-worker/offline files, icons, and recipe images.

The chat stream client parses SSE frames and validates event payloads before dispatch. `useChatStream` maps progress and tool calls into live UI state, renders directives, issues localized notifications, and invalidates query domains after AI actions. It uses a direct fetch/SSE client rather than the AI SDK’s `useChat` hook.

## 7. Root-level conventions, tests, and operational notes

- **Workspace task runner:** Turborepo builds in dependency order (`^build`) and typechecks in dependency order. `dev` tasks are persistent and uncached.
- **TypeScript:** shared base config and per-workspace TypeScript configs; package imports use `@app/*` workspace aliases.
- **Validation/tests:** AI has a focused Node test command covering agent loop, orchestration tools, LLM/SSE behavior, skills, adapters, tool definitions, and runner. Domain services and repositories have colocated tests, and the web client has feature, localization, proxy, auth, and service-worker tests. The report task did not run the test suites.
- **External integrations:** Neon Managed Auth/Postgres, S3-compatible media storage, Google Generative AI for model calls, and TheMealDB for image discovery.
- **Key architectural invariant:** deterministic mutations belong in domain services and are exposed through both Hono routes and AI tools; skills generate validated suggestions but do not directly mutate state.
- **MCP readiness:** tool contracts are separated from the Vercel runtime adapter, but standalone MCP hosting/adapter code is not present in the inspected tree.

## 8. Key source entry points

- `AGENTS.md` — repository architecture and code-quality principles.
- `.agents/architecture.md`, `.agents/ai-layer.md`, `.agents/ui-pwa.md` — subsystem specifications.
- `ai/runner.ts` — complete streaming-turn setup and orchestration handoff.
- `ai/agents/orchestrator.agent.ts` — orchestrator context and model-loop setup.
- `ai/agents/orchestrator.tools.ts` — specialist delegation and direct orchestrator tools.
- `ai/agents/agent-loop.ts` — common tool-aware model loop.
- `ai/tools/definitions/tool.types.ts` and `ai/tools/adapters/vercel.adapter.ts` — tool contract and Vercel invocation boundary.
- `server/index.ts` and `server/routes/chat.routes.ts` — API composition and chat stream endpoints.
- `modules/index.ts` and `modules/schemas.ts` — domain exports and shared schema catalog.
- `db/schema/index.ts` and `db/index.ts` — persistence schema composition and connection.
- `web-client/features/chat/hooks/use-chat-stream.ts` — browser-side event handling and cache/UI synchronization.
