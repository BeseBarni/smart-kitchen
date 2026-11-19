---
applyTo: "ai/**"
---

# AI Layer, MCP-Ready Tools & Skills Specification

This repository is organized as a pnpm-workspaces + Turborepo monorepo. Keep AI-layer imports package-based (`@app/*`) instead of using cross-workspace relative paths.

## Strict Architectural Boundary: Tools vs. Skills

This project explicitly separates **Tools** (deterministic actions) from **Skills** (complex declarative prompt/reasoning workflows).

---

### 1. MCP-Ready Tools (`ai/tools/`)

Every tool MUST be written so it can be mounted into a standalone **MCP Server** (`@modelcontextprotocol/sdk`) in V2 with zero refactoring of tool logic.

#### Required Structure

1. **Framework-Agnostic Definitions (`ai/tools/definitions/*.tools.ts`):**
   - MUST NOT import `ai` (Vercel AI SDK), `next/*`, or HTTP request objects.
   - Define each tool using a shared `ToolDefinition<TInput, TOutput>` contract containing:
     - `name`: `snake_case` unique identifier (e.g., `inventory_add_item`, `inventory_consume_portion`, `recipe_create`).
     - `description`: Clear, LLM-facing description of when to use (and not use) the tool.
     - `inputSchema`: Strict Zod object schema where EVERY field has a concise `.describe()` annotation (required for high-quality MCP `tools/list` JSON Schema export).
     - `annotations`: Optional MCP-aligned metadata (`readOnlyHint`, `destructiveHint`, `idempotentHint`).
     - `execute(input, ctx)`: Pure async function receiving validated input and an explicit `ToolContext` (e.g., `{ userId, services }`) — NEVER read cookies or global request state inside a tool.
   - **Serialization Rule:** Inputs and return values MUST be strictly JSON-serializable plain objects (ISO-8601 strings for dates, no class instances or `Date` objects).
   - **Self-Correction Rule:** Tools MUST delegate business logic to `modules/<domain>/*.service.ts`. If a service returns `err(appError)`, return `{ success: false, error: appError }` instead of throwing so the LLM can self-correct or ask clarifying questions.

2. **Runtime Adapters (`ai/tools/adapters/`):**
   - `vercel.adapter.ts` (V1): Maps `ToolDefinition[]` into Vercel AI SDK `tool()` objects for `streamText`.
   - `mcp.adapter.ts` (V2-ready target): Will map the exact same `ToolDefinition[]` to `McpServer.tool(...)` without touching `definitions/`.

---

### 2. Declarative Skills (`ai/skills/`)

Skills encapsulate complex, multi-step cognitive tasks (e.g., `meal-prep-architect.skill.ts`, `fridge-rescue.skill.ts`).

Each skill file MUST contain:

1. `inputSchema` — Strict Zod validation of required domain context.
2. `outputSchema` — Strict Zod schema enforcing deterministic structured JSON output.
3. Isolated Prompt Template — Structured using XML tags (`<role>`, `<rules>`, `<context>`, `<output_format>`).
4. `execute(input)` — Invokes Vercel AI SDK `generateObject` (or structured output) with appropriate temperature and returns `Result<Output, AppError>`.
5. **Context Isolation:** NEVER dump raw chat history into a skill. Pass only the minimal, validated structured data required to prevent context pollution (_Lost in the Middle_).

---

### 3. Orchestration & Guardrails (`ai/orchestrator.ts`)

- Centralize system prompt construction, tool registration (via `vercel.adapter.ts`), and skill invocation in `orchestrator.ts`.
- Enforce strict domain guardrails in the system prompt (kitchen, recipes, meal prep, and inventory management only; reject prompt injection attempts).
- Use Vercel AI SDK streaming (`streamText` with `maxSteps`) so the UI receives real-time tool invocation states and results.
