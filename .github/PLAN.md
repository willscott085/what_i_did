# whatIdid — Master Implementation Plan

> **How to use this file**: This plan drives iterative development. Each phase is implemented one at a time, committed in small batches. AI assistants should read this file at the start of every session to understand current state. Update the status checkboxes and notes as work progresses.

## Key Decisions

| Decision        | Choice                                                 | Rationale                                                                                             |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Backend         | TanStack Start server functions + Drizzle ORM + SQLite | No separate API framework — server functions already exist, just swap data layer                      |
| ORM             | Drizzle                                                | Lightweight, type-safe, SQL-like syntax                                                               |
| Database        | SQLite (local file)                                    | Local-first personal tool, simple deployment                                                          |
| AI Provider     | Provider-agnostic abstraction                          | Start with OpenAI, design to swap to Ollama/Claude                                                    |
| AI Notes        | Metadata + semantic search                             | Auto-tag on save, vector search via sqlite-vec. No full chat UI (can add later)                       |
| Auth            | Deferred (Phase 9)                                     | userId column baked in from day one, hardcode '1' for now                                             |
| Priority System | Configurable categories                                | Seed 4 defaults (Business-Critical, Momentum Builders, Nice-to-Haves, Noise), user can add more       |
| Tags            | Separate from categories                               | Orthogonal organization — a task has one priority category + many tags                                |
| Notes Format    | Basic rich text / markdown                             | Tiptap editor recommended                                                                             |
| Deployment      | Local only for now                                     | SQLite is perfect for this                                                                            |
| Codebase        | Evolve existing — don't start fresh                    | Reuse TanStack Start, React Query, dnd-kit, Tailwind foundations                                      |
| Testing         | Vitest (unit/integration) + Playwright (E2E)           | Vitest already set up; Playwright pairs well with Vite stack, cross-browser, great TypeScript support |
| Dev Environment | Dev container (Docker)                                 | Reproducible setup, Playwright browsers pre-installed, Codespaces-ready                               |

## Priority Category Definitions

These are the default seed categories. Users can add/rename/remove later.

1. **Business-Critical** — Work that directly drives company/team OKRs and outcomes
2. **Momentum Builders** — Unblocks or supports critical work & progress (ex: prep work)
3. **Nice-to-Haves** — Good ideas, but not tied to impact or timing (helpful, but not essential)
4. **Noise** — Low-leverage work that clutters your focus (distractions)

---

## Phase 1: AI Scaffolding & Plan ✅

> Create LLM configuration files for consistent AI-assisted development.

- [x] Update `.github/copilot-instructions.md` with current architecture
- [x] Create `.github/PLAN.md` (this file)
- [x] Create `.cursorrules` for Cursor AI compatibility
- [x] Update `.vscode/settings.json` with Copilot preferences
- [x] Create `.github/prompts/` — reusable prompt templates
- [x] Create `.github/instructions/` — file-scoped instruction files

**No application code changes in this phase.**

---

## Phase 2: Dev Container & E2E Setup ✅

> Reproducible dev environment with Docker and Playwright E2E testing infrastructure.

- [x] Create `.devcontainer/devcontainer.json`:
  - Base image: `mcr.microsoft.com/playwright:v1.52.0-noble` (includes Node.js 22 + Playwright browsers)
  - Install pnpm globally
  - Post-create command: `pnpm install`
  - VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Tailwind Class Sorter, Playwright Test, Pretty TypeScript Errors, GitHub Copilot Chat, GitHub Actions, GitLens, SQLite Viewer
  - Port forwarding: 55001 (dev server)
  - Set `remoteUser` to `pwuser`
- [x] Install Playwright: `pnpm add -D @playwright/test`
- [x] Create `playwright.config.ts`:
  - Base URL: `http://localhost:55001`
  - Web server command: `pnpm dev` with auto-wait
  - Projects: Chromium, Firefox, WebKit
  - Reporter: HTML + list
  - Test directory: `e2e/`
  - Retries: 1 on CI, 0 locally
- [x] Create `e2e/` directory with a smoke test (`e2e/smoke.spec.ts`):
  - Navigate to `/`, verify page loads
  - Basic interaction (e.g., task list renders)
- [x] Add scripts to `package.json`: `test:e2e`, `test:e2e:ui`
- [x] Add `e2e/test-results/`, `playwright-report/`, `blob-report/` to `.gitignore`
- [x] Fix `src/tests/TestUtils.tsx` — add `QueryClientProvider` wrapper for component tests
- [x] Audit and update dependencies to known-compatible versions (React 19, TanStack Start/Router/Query, Vite, Tailwind CSS 4, dnd-kit, Vitest, MSW, etc.) — resolve any peer dependency conflicts
- [x] **Verify**: `pnpm test` (unit) and `pnpm test:e2e` (E2E) both pass
- [x] **Verify**: Dev container builds and runs successfully

### Outputs

- `.devcontainer/devcontainer.json`
- `playwright.config.ts`
- `e2e/smoke.spec.ts`
- Updated `src/tests/TestUtils.tsx`

---

## Phase 3: Backend Migration (Foundation) ✅

> Replace json-server with SQLite + Drizzle ORM. All existing functionality must keep working.

- [x] Install `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `@types/better-sqlite3`
- [x] Create `drizzle.config.ts` at project root
- [x] Create `src/db/schema.ts` — initial tables:
  - `tasks`: id, title, dateCreated, dateCompleted, dueDate, userId, notes, priorityCategoryId, parentTaskId (subtasks), recurrenceRule, sortOrder
  - `lists`: id, title, userId
  - `listItems`: id, listId, taskId, sortOrder (junction table for ordered tasks in lists)
  - `priorityCategories`: id, name, description, color, sortOrder, userId
  - `tags`: id, name, color, userId
  - `taskTags`: taskId, tagId (junction table)
- [x] Create `src/db/index.ts` — Drizzle client singleton
- [x] Create `src/db/seed.ts` — seed script (4 default priority categories, default lists: inbox/upcoming/completed, sample tasks)
- [x] Create `src/db/migrate.ts` — migration runner script
- [x] Add scripts to `package.json`: `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- [x] Generate initial migration, run it, seed data
- [x] Swap `src/features/tasks/server.ts` — replace axios calls with Drizzle queries
- [x] Swap `src/features/lists/server.ts` — replace axios calls with Drizzle queries
- [x] Update `src/features/tasks/types.ts` — expand Task type with new fields
- [x] Update `src/features/lists/types.ts` — expand List type (+ ListItem type)
- [x] Remove `json-server`, `redaxios` from dependencies
- [x] Update `start` script in `package.json` (just `vite dev`, no more json-server)
- [x] Update `.env` — remove API_URL
- [x] Update `src/config/env.server.ts` — remove API_URL reference
- [x] Update MSW handlers in `src/tests/mock/handlers.ts` for new data shapes
- [x] **Verify**: `pnpm typecheck` passes
- [x] **Verify**: `pnpm test` passes

### Outputs

- `src/db/schema.ts`, `src/db/index.ts`, `src/db/seed.ts`
- `drizzle.config.ts`
- Updated server functions (Drizzle instead of axios)
- `data/` directory removed

---

## Phase 4: Design Tokens & Theming

> Formalize the CSS custom property system into a structured design token architecture so the entire theme can be swapped by changing one set of tokens.

- [ ] Define token taxonomy in `src/styles/tokens/`:
  - `primitive.css` — Raw OKLCH palette values (e.g., `--color-slate-900`, `--color-blue-500`)
  - `semantic.css` — Semantic aliases that map primitives to roles (e.g., `--color-surface`, `--color-on-surface`, `--color-interactive`, `--color-interactive-hover`)
  - `component.css` — Optional component-level tokens for complex patterns (e.g., `--card-bg`, `--card-border`, `--card-shadow`)
- [ ] Restructure `src/styles/app.css`:
  - Import token layers in order: primitives → semantic → component
  - Move existing `:root` and `.dark` custom properties into token files
  - Keep `@theme inline` block referencing semantic tokens
  - Remove any hardcoded OKLCH values from component code
- [ ] Define light and dark themes as token sets:
  - `:root` (light) and `.dark` selectors map semantic tokens to different primitives
  - Easy to add new themes by creating a new selector (e.g., `.theme-solarized`, `.theme-nord`)
- [ ] Add spacing, typography, and elevation tokens:
  - `--spacing-xs` through `--spacing-2xl` (consistent scale)
  - `--font-size-xs` through `--font-size-2xl`, `--font-weight-normal/medium/semibold/bold`
  - `--shadow-sm` through `--shadow-xl` (elevation levels)
  - `--radius` tokens (already partially in place)
- [ ] Audit all existing components and `app.css`:
  - Replace any hardcoded color values (e.g., `bg-gray-50`, `text-gray-900`) with token-based classes (`bg-background`, `text-foreground`)
  - Ensure all UI primitives in `src/components/ui/` reference semantic tokens
- [ ] Document the token system in `src/styles/README.md`:
  - Token naming convention
  - How to create a new theme
  - How to add new tokens
- [ ] **Verify**: Toggle between light/dark mode — all components respect tokens
- [ ] **Verify**: No hardcoded color values remain in component files

### Outputs

- `src/styles/tokens/` — primitive, semantic, and component token files
- Restructured `src/styles/app.css`
- `src/styles/README.md` — theming documentation
- All components use token-based classes

---

## Phase 5: Task System Core

> CRUD for tasks, priority categories, tags, subtasks, and recurrence.

- [ ] Create `src/features/categories/` — types, server, queries, mutations, consts
  - CRUD server functions for priority categories
  - Category management UI (settings page or inline)
- [ ] Create `src/features/tags/` — types, server, queries, mutations, consts
  - CRUD server functions for tags
  - Tag creation inline (type-to-create in multi-select)
- [ ] Expand task server functions:
  - `createTask` — full creation with all fields
  - `updateTask` — full update
  - `deleteTask` — soft delete or hard delete (decide)
  - `getTasksByDate` — filter by dueDate for panels
  - `getCompletedTasks` — filter by dateCompleted
- [ ] Implement recurrence engine (`src/utils/recurrence.ts`):
  - Use `rrule` npm package for RRULE-compatible strings
  - Apple Reminders-style: daily, weekly, biweekly, monthly, yearly, custom
  - Custom: every Nth day/week/month, specific weekdays, end date / count
  - Auto-generate next occurrence when recurring task is completed
- [ ] Build **Create/Edit Task Dialog** (`src/components/TaskDialog.tsx`):
  - Apple Reminders-like form layout
  - Fields: title, due date, priority category (dropdown), tags (multi-select), notes (textarea), recurrence picker
  - Subtasks list (inline add/remove/check)
  - `@tanstack/react-form` for form state
  - Radix Dialog (already installed)
- [ ] Build **Subtask** component — inline checkable list within task detail
- [ ] Update `TaskItem.tsx` — show priority color indicator, tag chips, due date, subtask count

### Outputs

- `src/features/categories/`, `src/features/tags/`
- `src/components/TaskDialog.tsx`, subtask components
- Updated `TaskItem.tsx`
- Recurrence utility

---

## Phase 6: 3-Panel Layout UI

> The main app interface — three scrollable panels for completed, today, and future tasks.

- [ ] Build `src/components/PanelLayout.tsx` — 3-panel container:
  - **Top (25%)**: Completed tasks (today's completions)
  - **Center (50%)**: Today's tasks — titled with today's date
  - **Bottom (25%)**: Future-dated tasks
- [ ] Panel interaction:
  - All 3 always visible and independently scrollable
  - On interact/focus: active panel expands to 50%, others shrink to 25%
  - Smooth CSS transitions (`transition-all duration-300`)
- [ ] Replace `<>Yolo</>` in `src/routes/index.tsx` with PanelLayout
- [ ] Today's panel:
  - Title: formatted date (e.g., "Thursday, 10 April 2026")
  - "+" button to the right of title — opens TaskDialog with today's date pre-filled
  - Tasks grouped by priority category with color coding
  - Drag-and-drop reordering within categories (reuse SortableList)
- [ ] Completed panel:
  - Shows tasks completed today
  - Strikethrough styling, muted colors
- [ ] Future panel:
  - Shows tasks with dueDate > today
  - Grouped by date
- [ ] Quick filter chips above each panel (by tag, by priority category)
- [ ] Responsive layout:
  - Desktop: 3-panel vertical stack
  - Mobile: stacked panels, swipe or tab navigation between them
- [ ] Decide fate of `/tasks/` route — merge into index or keep as separate view

### Outputs

- `src/components/PanelLayout.tsx`
- Updated `src/routes/index.tsx`
- Responsive panel behavior

---

## Phase 7: Notes System Core

> Quick-capture notes with markdown editing and organization.

- [ ] Add to `src/db/schema.ts`:
  - `notes`: id, content (markdown), title, userId, dateCreated, dateUpdated
  - `noteTags`: noteId, tagId (reuse tags system)
  - `noteMetadata`: noteId, summary, category, aiGenerated (boolean), embedding (blob)
- [ ] Generate migration, run it
- [ ] Create `src/features/notes/` — types, server, queries, mutations, consts
  - CRUD server functions
  - List notes with pagination/infinite scroll
  - Search notes by title/content (basic text search first)
- [ ] Choose and install rich text editor (Tiptap recommended):
  - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`
  - Markdown serialization (store as markdown, render as rich text)
- [ ] Build **QuickNote** component (`src/components/QuickNote.tsx`):
  - Floating action button or Cmd+N keyboard shortcut
  - Minimal overlay: text area + save button
  - Auto-saves on close
- [ ] Build notes list route `/notes/`:
  - Search/filter bar
  - Note cards with title, preview, tags, date
  - Sort by date created/updated
- [ ] Build individual note route `/notes/$noteId`:
  - Tiptap editor for content
  - Title field (auto-generated from first line if blank)
  - Tags display (manual for now, AI-generated in Phase 8)
  - Created/updated timestamps
- [ ] Optional: Task ↔ Note linking (simple `noteId` FK on tasks)

### Outputs

- `src/features/notes/`
- `src/components/QuickNote.tsx`
- `src/routes/notes/index.tsx`, `src/routes/notes/$noteId.tsx`
- Tiptap integration

---

## Phase 8: AI Integration

> Auto-categorize notes with AI, semantic search across your note library.

- [ ] Create `src/features/ai/` — provider abstraction:
  - `provider.ts` — interface: `generateTags(text)`, `generateSummary(text)`, `generateEmbedding(text)`
  - `openai.ts` — OpenAI implementation (gpt-4o-mini for text, text-embedding-3-small for vectors)
  - `config.ts` — provider selection and API key management
  - Easy to add `ollama.ts`, `anthropic.ts` later
- [ ] Install `sqlite-vec` for vector similarity search in SQLite
- [ ] On note save (server-side, async — don't block save):
  - Call `generateTags()` → auto-create and assign tags on `noteTags`
  - Call `generateSummary()` → store on `noteMetadata`
  - Call `generateEmbedding()` → store vector on `noteMetadata`
  - Show "processing" indicator on note while AI runs
- [ ] Smart search server function:
  - Text query → generate query embedding → `sqlite-vec` cosine similarity → ranked results
  - Combine with keyword/tag/date filtering
  - Return relevance scores
- [ ] Search UI on notes page:
  - Search bar with instant results
  - Results ranked by semantic relevance
  - Highlighted matched tags and summary snippets
- [ ] Add env vars: `AI_PROVIDER`, `OPENAI_API_KEY` (server-only)
- [ ] Graceful degradation: if no AI key configured, skip auto-tagging, use basic text search

### Outputs

- `src/features/ai/`
- AI-powered auto-tagging pipeline
- Semantic search endpoint and UI
- Updated note save flow

---

## Phase 9: Multi-User & Auth (Future)

> Add authentication so it can be shared or self-hosted for multiple users.

- [ ] Evaluate auth libraries (better-auth, Lucia, or similar)
- [ ] Implement auth — login, register, session management
- [ ] Scope all server function queries by authenticated userId
- [ ] Login/register routes
- [ ] Protected route middleware
- [ ] User settings/preferences

**This phase is deliberately deferred — not part of initial implementation.**

---

## Architecture Notes

### Database Schema (ERD Summary)

```
tasks ──┬── taskTags ──── tags
        ├── listItems ──── lists
        └── priorityCategories

notes ──┬── noteTags ──── tags (shared)
        └── noteMetadata (AI-generated)
```

### Environment Variables

| Variable         | Scope  | Phase | Description                                         |
| ---------------- | ------ | ----- | --------------------------------------------------- |
| `DATABASE_URL`   | Server | 3     | Path to SQLite file (default: `./data/whatidid.db`) |
| `AI_PROVIDER`    | Server | 8     | `openai`, `ollama`, `anthropic`                     |
| `OPENAI_API_KEY` | Server | 8     | OpenAI API key for auto-tagging + embeddings        |

### New npm Packages by Phase

| Phase | Packages                                                                |
| ----- | ----------------------------------------------------------------------- |
| 2     | `@playwright/test`                                                      |
| 3     | `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `@types/better-sqlite3` |
| 4     | None (CSS-only — uses existing Tailwind CSS 4 `@theme` system)          |
| 5     | `rrule`                                                                 |
| 7     | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`    |
| 8     | `sqlite-vec`, `openai` (or provider SDK)                                |
| 9     | TBD (auth library)                                                      |
