---
applyTo: "web-client/**"
---

# UI, Feature-Based Architecture, State & PWA Guidelines

## 1. Mandatory Stitch MCP Workflow

**CRITICAL RULE:** Before creating, redesigning, or modifying ANY UI screen, layout, or visual component:

1. You MUST invoke the **Stitch MCP** to fetch the latest UI design specifications, layout hierarchy, color tokens, and spacing.
2. Treat the Stitch MCP output as the visual source of truth. Do not invent arbitrary layouts, colors, or spacing when a Stitch specification exists.
3. If a requested feature is not yet represented in Stitch, explicitly flag it and strictly reuse existing Stitch design tokens and component patterns.

---

## 2. Feature-Based Frontend Structure (`web-client/`)

Organize `web-client/` strictly by **feature** rather than dumping all files into flat global folders. Keep global folders minimal and reserved ONLY for truly cross-cutting primitives.

```text
web-client/
├── app/                          # Next.js App Router (thin route pages + API adapter ONLY)
├── components/                   # Truly global, domain-agnostic UI ONLY
│   ├── ui/                       # shadcn/ui primitives (button, sheet, badge, input...)
│   └── layout/                   # AppShell, BottomNav, SafeAreaContainer
├── lib/                          # App-wide singletons (hono api-client, query-client, cn utils)
└── features/                     # Cohesive feature modules (inventory, recipes, chat)
    └── <feature>/
        ├── components/           # Feature dumb components & feature container/orchestrators
        ├── hooks/                # Feature TanStack Query hooks & local UI hooks
        ├── stores/               # Feature-scoped Zustand store (ephemeral UI state)
        ├── api/                  # Feature API facade (mock -> Hono RPC swap boundary)
        ├── mocks/                # Typed mock datasets & async placeholder handlers
        ├── utils/                # Pure domain formatting, sorting, and helper functions
        ├── types.ts              # Feature-local UI types (if not covered by @app/modules/schemas)
        └── index.ts              # Public barrel export for the feature
```
