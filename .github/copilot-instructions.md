# Copilot Instructions for what_i_did

> **Master plan**: See `.github/PLAN.md` for the full iterative implementation plan and current phase status.

## Context

**whatIdid** is a personal task tracker, notes system, and reminder app with AI-powered features. Built with React 19, TypeScript, and TanStack Start as a full-stack framework. The app uses a **unified `items` table** — tasks, notes, and events (reminders) are all items differentiated by a `type` column. Schedules (reminder timing, recurrence) attach to any item. Check `.github/PLAN.md` for the current phase.

### Tech Stack

- **Language:** TypeScript (strict mode)
- **Framework:** React 19 (functional components, hooks), TanStack Start (full-stack)
- **Routing:** TanStack Router (file-based routes in `src/routes/`)
- **Data Fetching:** TanStack React Query (queries, mutations, optimistic updates)
- **Forms:** TanStack React Form
- **Database:** PostgreSQL via Drizzle ORM
- **Styling:** Tailwind CSS 4, tailwind-variants
- **UI Primitives:** Radix UI (headless, accessible components — dialog, select, checkbox, tooltip, etc.)
- **Drag & Drop:** dnd-kit (core, sortable)
- **Testing:** Vitest, React Testing Library, MSW (mocking)
- **Linting/Formatting:** ESLint, Prettier
- **Build Tooling:** Vite
- **PWA:** Hand-rolled service worker (`public/sw.js`) for push notifications and update prompt
- **AI:** Provider-agnostic abstraction (OpenAI default, swappable)

## Architecture

### Data Flow

1. **Route loaders** pre-fetch data via `ensureQueryData` with React Query options
2. **Components** consume data via `useQuery` / `useSuspenseQuery`
3. **Mutations** use optimistic updates: cancel in-flight queries → update cache → revalidate on settle
4. **Server functions** (`createServerFn`) handle all data access — these run server-side and call the database directly via Drizzle

### Feature Structure

Each feature domain lives in `src/features/{domain}/` with these files:

- `types.ts` — TypeScript types and Zod schemas
- `server.ts` — Server functions (data access layer)
- `queries.ts` — React Query options (queryKey, queryFn wrapping server functions)
- `mutations.ts` — React Query mutations with optimistic updates
- `consts.ts` — Query keys and constants

### Server Functions Pattern

```typescript
export const myFunction = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      /* zod schema */
    }),
  )
  .handler(async ({ data }) => {
    // Direct database access via Drizzle — no HTTP calls
    return db.select().from(table).where(eq(table.id, data.id));
  });
```

### Database Pattern (Drizzle + PostgreSQL)

- Schema defined in `src/db/schema.ts`
- Drizzle client singleton in `src/db/index.ts`
- Migrations managed via `drizzle-kit` (`pnpm db:generate`, `pnpm db:migrate`)
- All tables include `userId` column (multi-user ready, hardcoded '1' for now)
- **Unified `items` table** — single table with `type` column (`task` | `note` | `event`). One `itemTags` junction table, one `itemMetadata` table. `schedules` table attaches to any item for reminder timing and recurrence.
- **ID prefixes** — `tsk_` (task), `nte_` (note), `evt_` (event), `sch_` (schedule), `shx_` (schedule history)
- **Thin adapters** — `features/tasks/`, `features/notes/`, `features/events/` are facade layers that delegate to `features/items/` with type filters

## File & Folder Organization

- `src/features/{domain}/` — Feature modules (items, tasks, tags, notes, events, schedules, ai)
- `src/features/items/` — Shared base layer: unified CRUD for all item types
- `src/features/tasks/` — Thin adapter over items (type='task' filter)
- `src/features/notes/` — Thin adapter over items (type='note' filter)
- `src/features/events/` — Thin adapter over items (type='event' filter)
- `src/features/schedules/` — Reminder timing, recurrence (RRULE), push notifications
- `src/components/` — Shared UI components
- `src/components/ui/` — Primitive UI components (button, dialog, input, etc.)
- `src/routes/` — File-based routes (TanStack Router)
- `src/db/` — Database schema, client, and seed data
- `src/utils/` — Shared utilities
- `src/hooks/` — Custom React hooks
- `src/styles/` — Global CSS and theming
- `src/tests/` — Test setup and mocks
- `src/config/` — Environment configuration (server/client split)
- `public/` — Static assets, PWA icons, web manifest

## Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Omit semicolons
- Prefer `const` and `let` over `var`
- Use arrow functions where possible
- Use named exports; avoid default exports unless necessary
- Use PascalCase for components and enums, camelCase for variables and functions
- Prefer early returns for guard clauses
- Keep files focused — one server function group per feature
- Multiple components per file are fine for local/helper components; extract to a separate file when reused elsewhere

## Styling & Design Tokens

- Use Tailwind CSS for all styling — no inline styles
- Use utility classes and `tailwind-variants` for component variants
- Use the `cn` or `twMerge` helpers for class composition
- Dark mode via `.dark` class selector with OKLCH color theming
- Responsive design: mobile-first approach
- **Design tokens**: All colors, spacing, typography, and elevation are defined as CSS custom properties in `src/styles/tokens/`
  - **Primitives** (`primitive.css`): Raw OKLCH palette values
  - **Semantic** (`semantic.css`): Role-based aliases (e.g., `--color-surface`, `--color-interactive`)
  - **Component** (`component.css`): Optional component-level tokens
- Never use hardcoded color values in components — always reference semantic tokens via Tailwind classes (`bg-background`, `text-foreground`, etc.)
- To create a new theme, add a new CSS selector (e.g., `.theme-nord`) that remaps semantic tokens to different primitives

## Testing

- **Unit/Integration**: Vitest + React Testing Library, MSW for network mocking
- Place unit tests next to the code under test or in `src/tests/`
- **E2E**: Playwright (Chromium, WebKit) — tests live in `e2e/`
- Run unit: `pnpm test`, E2E: `pnpm test:e2e`, E2E UI: `pnpm test:e2e:ui`
- Do not use `.only` in tests; the linter will fail the build
- Mock network requests with MSW where possible
- Test server functions by mocking the Drizzle client
- Dev container (`.devcontainer/`) provides a reproducible environment with Playwright browsers pre-installed

## Environment & Configuration

- Use `.env.local` for local environment variables
- Never commit secrets or credentials (especially AI API keys)
- Server-only env vars in `src/config/env.server.ts` (throws if accessed client-side)
- Client env vars in `src/config/env.client.ts`
- Document new environment variables in the README

## Key Conventions

- All data mutations go through server functions — never call the DB from client code
- Use Zod for input validation on all server functions
- **Multi-user ready** — every table has a `userId` column and auth lands in Phase 10. Today the client passes `DEFAULT_USER_ID = '1'` (see each feature's `consts.ts`), but server functions MUST accept `userId` via their Zod input and filter every read/write by it (join through `items.userId` where the table itself doesn't carry one, e.g. `schedules`, `itemTags`). Never hardcode `'1'` inside `server.ts` — it breaks the moment Phase 10 swaps the source of truth for the current user.
- React Query keys follow the pattern: `{ all: [domain], byType: [domain, type], byId: [domain, id] }`
- Optimistic updates are the default for mutations affecting UI state
- Components that need hydration-awareness use `useEffect` state guard
- Drag-and-drop components use dnd-kit with `useSortable` hook per item
- **Finishing a (sub)phase** — when you complete a phase or sub-phase from `.github/PLAN.md`, the reply that announces completion MUST include a "How to test" section alongside the summary of changes. Cover: setup (seed / route to open), numbered user actions, expected results, and any cleanup. Keep it scoped to the delta introduced by the phase.
- **PWA**: The app is a Progressive Web App with a hand-rolled service worker at `public/sw.js` (copied to `.output/public/` during build). It handles `push` / `notificationclick` events and SKIP_WAITING for reload prompts. The `ReloadPrompt` component in `src/components/ReloadPrompt.tsx` registers the SW and shows an update prompt when a new version takes control. The SW is not registered in dev mode.
