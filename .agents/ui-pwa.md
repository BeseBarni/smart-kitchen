---
applyTo: "web-client/**"
---

# UI, Feature-Based Architecture, State & PWA Guidelines

## 1. Mandatory Stitch MCP Workflow

**CRITICAL RULE:** Before creating, redesigning, or modifying ANY UI screen, layout, or visual component:

1. You MUST invoke the **Stitch MCP** and consult the **PrepPilot Meal Assistant PWA** project (`projects/16094289543776527`) to fetch the latest UI design specifications, layout hierarchy, color tokens, and spacing.
2. Treat the Stitch MCP output as the visual source of truth. Do not invent arbitrary layouts, colors, or spacing when a Stitch specification exists.
3. If a requested feature is not yet represented in Stitch, explicitly flag it and strictly reuse existing Stitch design tokens and component patterns.

---

## 2. Feature-Based Frontend Structure (`web-client/`)

### Mandatory localization

All application-authored user-facing text, including accessibility labels, validation and error messages, toasts, offline content, metadata, and plural forms, must be defined in English, Hungarian, and Spanish under `web-client/lib/i18n/dictionaries/`. Use `useText()` in React, `getText()` in client callbacks, or the pure Text Orchestrator for server and static contexts. Do not hardcode UI copy. Keep locale dictionaries in compile-time key parity and retain matching interpolation parameters. User-provided and AI-generated content, protocol identifiers, and native language labels are not translated UI copy.

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

Feature Encapsulation Rules
No Flat Dumping: NEVER put feature-specific components, hooks, stores, or utils into top-level web-client/components/ or web-client/lib/.

Cross-Feature Imports: Features MUST NOT import from another feature's internal subdirectories (e.g., never import features/recipes/utils/... from inventory). Cross-feature access MUST go through features/<other-feature>/index.ts, or shared logic must be promoted to web-client/components/ or web-client/lib/.

Create Only What's Needed: Only create subfolders inside a feature when files exist for them (do not commit empty placeholder folders).

3. Inside-Out (Bottom-Up) Component Architecture
   Build every feature strictly from the inside out, maximizing reusable stateless components before wiring containers:

Layer 1 — Dumb / Presentational Components (web-client/components/ui/ & features/<feature>/components/):

Design and build as many pure, presentational ("dumb") components as possible FIRST (e.g., PortionStepper, StorageBadge, FreshnessIndicator, InventoryItemCard, RecipeCard, ToolExecutionPill).

Dumb components MUST be unaware of TanStack Query, API clients, or business logic. They receive data and callbacks via clean, minimal typed props.

Layer 2 — Feature Orchestrator / Container Components (features/<feature>/components/*View.tsx, *Sheet.tsx):

Compose dumb components into cohesive feature views (e.g., InventoryView, AddInventorySheet, ChatView).

Connect feature TanStack Query hooks, feature Zustand stores, and react-hook-form here.

Layer 3 — Thin Route Pages (web-client/app/(pwa)/\*\*/page.tsx):

Pages MUST stay ultra-thin (< 50 lines): they only render the top-level feature orchestrator exported from features/<feature>/index.ts.

4. Strict File Size & Decomposition Policy
   Hard Limit: Keep every TypeScript / TSX file under 200–300 lines (aim for < 200 lines; 300 lines is an absolute ceiling).

Mandatory Refactoring: If any component, hook, or store approaches 200+ lines, IMMEDIATELY extract pieces into the feature's own subdirectories:

Smaller presentational child components (features/<feature>/components/),

Dedicated custom hooks (features/<feature>/hooks/),

Pure helper/formatter functions (features/<feature>/utils/).

Never build "God components" mixing layout markup, form setup, query wiring, and formatting logic in one file.

5. Modular State Management (Zustand — No Prop Drilling, No Monolith)
   Zero Prop Drilling: Never pass UI state or callbacks through more than 2 intermediate component layers. Lift shared feature UI state into that feature's Zustand store.

Co-located Feature Stores: NEVER create a single monolithic global store. Place each store inside its feature (features/<feature>/stores/):

features/inventory/stores/inventory-ui.store.ts (storage filter tab, search query, add/edit sheet open state & selected item ID)

features/recipes/stores/recipes-ui.store.ts (filter chips, search query, active recipe detail sheet)

features/chat/stores/chat-ui.store.ts (composer draft, active quick-skill selection)

Strict Boundary: Store ONLY ephemeral client UI state in Zustand. NEVER duplicate or cache server entities inside Zustand stores.

6. UI-First Implementation & Backend-Ready Mock Pattern
   During the UI implementation phase, do NOT implement heavy business logic in the frontend. Build the full component hierarchy and data-flow wiring so real backend endpoints can be swapped in cleanly later:

Pre-wire TanStack Query Hooks (features/<feature>/hooks/):

Build feature hooks upfront (e.g., use-inventory.ts, use-recipes.ts) using @tanstack/react-query (useQuery, useMutation) and co-located query key factories (e.g., inventoryKeys in features/inventory/api/inventory.keys.ts).

Isolated Mock & API Facade (features/<feature>/api/ & mocks/):

NEVER hardcode mock arrays inside .tsx components.

Keep typed placeholder datasets and async mock handlers in features/<feature>/mocks/<feature>.mock.ts, matching the DTO shapes from @app/modules/schemas (or @app/shared).

Point TanStack Query queryFn / mutationFn to a thin facade in features/<feature>/api/<feature>.api.ts. Initially it delegates to mocks/; later it switches 1-to-1 to the typed Hono RPC client (web-client/lib/api-client.ts via @app/server) without modifying a single component or hook signature.

AI-to-UI Sync Readiness: Keep query keys exported from each feature's index.ts so that when @ai-sdk/react (useChat) tool calls are wired in later, onToolCall / onFinish can invalidate affected feature queries (queryClient.invalidateQueries) and trigger a sonner toast.

7. Monorepo Boundaries, Forms & Styling
   No Direct Backend Coupling: NEVER import @app/db, Drizzle queries, or @app/modules services/repos inside web-client/. Only import shared Zod schemas (@app/modules/schemas), shared primitives (@app/shared), and Hono's AppType (@app/server).

Forms: Build manual forms with react-hook-form + @hookform/resolvers/zod, reusing Zod schemas from @app/modules/schemas (or matching feature schemas during the mock phase).

UI Primitives: Use Tailwind CSS + shadcn/ui (web-client/components/ui/) + lucide-react icons + sonner toasts.

8. Mobile-First & PWA Standards
   Design strictly for mobile viewports (375px–430px) first, scaling cleanly to desktop.

Implement a sticky bottom navigation bar (Chat, Inventory, Recipes) in web-client/components/layout/ with safe-area padding (pb-[env(safe-area-inset-bottom)]).

Enforce minimum 44x44px touch targets on all interactive controls (buttons, -/+ portion steppers, tabs).

Maintain web-client/app/manifest.ts (display: "standalone", icons, theme color) and mobile viewport meta tags (viewport-fit=cover) for a native full-screen PWA experience.
