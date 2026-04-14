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

## Phase 4: Design Tokens & Theming ✅

> Formalize the CSS custom property system into a structured design token architecture so the entire theme can be swapped by changing one set of tokens.

- [x] Define token taxonomy in `src/styles/tokens/`:
  - `primitive.css` — Raw OKLCH palette values (e.g., `--primitive-slate-900`, `--primitive-blue-500`)
  - `semantic.css` — Semantic aliases that map primitives to roles (e.g., `--background`, `--foreground`, `--destructive`, `--destructive-foreground`)
  - `component.css` — Optional component-level tokens for complex patterns (e.g., `--task-drag-handle`, `--overlay-bg`)
  - `scale.css` — Non-color foundational scales (spacing, typography, elevation)
- [x] Restructure `src/styles/app.css`:
  - Import token layers in order: primitives → scale → semantic → component
  - Move existing `:root` and `.dark` custom properties into token files
  - `@theme inline` block bridges semantic + scale tokens into Tailwind
  - No hardcoded OKLCH values in component code
- [x] Define light and dark themes as token sets:
  - `:root` (light) and `.dark` selectors map semantic tokens to different primitives
  - System preference detection via inline script — `prefers-color-scheme` toggles `.dark` class on `<html>`
  - Live updates when OS preference changes (`matchMedia` change listener)
  - Easy to add new themes by creating a new selector (e.g., `.theme-solarized`, `.theme-nord`)
- [x] Add spacing, typography, and elevation tokens:
  - `--spacing-xs` through `--spacing-2xl` (consistent scale)
  - `--font-size-xs` through `--font-size-2xl`, `--font-weight-normal/medium/semibold/bold`
  - `--shadow-sm` through `--shadow-xl` (elevation levels, bridged into Tailwind)
  - `--radius` tokens (already in place)
- [x] Audit all existing components and `app.css`:
  - No hardcoded color values remain (`bg-gray-50`, `text-white`, etc. all replaced)
  - All UI primitives in `src/components/ui/` reference semantic tokens
  - `TaskItem.tsx` uses component tokens (`--task-drag-handle`) instead of direct semantic refs
  - `button.tsx` destructive variant uses `text-destructive-foreground` (new token)
- [x] Document the token system in `src/styles/README.md`:
  - Token naming convention and layer taxonomy
  - How to create a new theme
  - How to add new tokens
- [x] **Verify**: Light/dark mode follows system preference — all components respect tokens
- [x] **Verify**: No hardcoded color values remain in component files (grep audit clean)
- [x] **Verify**: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all pass

### Outputs

- `src/styles/tokens/` — primitive, scale, semantic, and component token files
- Restructured `src/styles/app.css` with `@theme inline` bridge
- `src/styles/README.md` — theming documentation
- System-based dark/light mode in `src/routes/__root.tsx` (inline script, no FOUC)
- All components use token-based classes

---

## Phase 5: Task System Core ✅

> CRUD for tasks, priority categories, tags, subtasks, and recurrence.

- [x] Create `src/features/categories/` — types, server, queries, mutations, consts
  - CRUD server functions for priority categories
  - Category management UI (inline in task dialog — CategorySelect component)
- [x] Create `src/features/tags/` — types, server, queries, mutations, consts
  - CRUD server functions for tags
  - Tag creation inline (type-to-create in multi-select — TagMultiSelect component)
- [x] Expand task server functions:
  - `createTask` — full creation with all fields (tags, priority, recurrence, subtasks)
  - `updateTask` — full update with tag sync (delete + re-insert in transaction)
  - `deleteTask` — hard delete (subtasks deleted first, FK cascade handles junctions)
  - `fetchTaskWithRelations` — single task with priority category, tags, subtasks
  - `fetchSubtasks` — direct children by parentTaskId
  - Inbox/upcoming queries now exclude subtasks (filter `parentTaskId IS NULL`)
- [x] Implement recurrence engine (`src/utils/recurrence.ts`):
  - Uses `rrule` npm package for RRULE-compatible strings
  - Presets: daily, weekdays, weekly, biweekly, monthly, yearly
  - Custom: every Nth day/week/month/year, specific weekdays
  - Auto-generate next occurrence when recurring task is completed (in `completeTask` handler)
  - `detectPreset()` for round-tripping RRULE → UI preset selection
- [x] Build **Create/Edit Task Dialog** (`src/components/TaskDialog.tsx`):
  - Fields: title, due date, priority category (CategorySelect), tags (TagMultiSelect), notes (textarea), recurrence (RecurrencePicker)
  - Subtasks list (inline add/complete/delete — SubtaskList component, edit mode only)
  - Radix Dialog wrapper
- [x] Build **SubtaskList** component — single-level only (subtasks cannot have subtasks)
- [x] Build **RecurrencePicker** component — preset buttons + custom builder
- [x] Build **CategorySelect** component — inline CRUD (add/edit/delete categories from dropdown)
- [x] Build **TagMultiSelect** component — multi-select with inline tag creation
- [x] Update `TaskItem.tsx`:
  - Priority category color indicator (colored bar)
  - Due date badge (overdue=red, today=amber, future=muted)
  - Subtask count badge with expand/collapse
  - Inline SubtaskList on expand
  - Edit button → opens TaskDialog; Delete button → hard delete
  - Notes preview below task title (max 3 lines, `line-clamp-3`, `break-all` for long URLs)
  - URLs in notes auto-linkified (clickable `<a>` tags via `Linkify` component)
  - Notes hidden for completed tasks
- [x] Update `/tasks/` route — "+" button opens TaskDialog, edit/delete wired up
- [x] Update seed data — tags, task-tag relationships, category assignments, subtasks, recurring task
- [x] **Verify**: `pnpm typecheck` passes — zero errors
- [x] **Verify**: `pnpm test` passes — existing unit tests still green
- [x] **Verify**: `pnpm db:seed` runs successfully

### Decisions

- **Task deletion**: Hard delete (no soft delete)
- **Subtask depth**: Single level only (subtasks cannot have subtasks)
- **Recurrence**: Full `rrule` implementation with auto-generation on completion
- **Category management**: Inline in the task dialog (CategorySelect with add/edit/delete)

### Outputs

- `src/features/categories/` (types, consts, server, queries, mutations)
- `src/features/tags/` (types, consts, server, queries, mutations)
- `src/utils/recurrence.ts`
- `src/components/TaskDialog.tsx`, `RecurrencePicker.tsx`, `SubtaskList.tsx`, `TagMultiSelect.tsx`, `CategorySelect.tsx`
- Updated `src/components/TaskItem.tsx`, `src/routes/tasks/index.tsx`, `src/db/seed.ts`
- Updated `src/features/tasks/` (types, server, consts, queries, mutations)

---

## Phase 6: Calendar + Day View UI ✅

> The main app interface — a 3-month mini calendar sidebar with a scrollable day view.

### Layout

- **Left sidebar** (fixed ~240px, hidden on mobile): 3-month stacked mini calendar (prev/current/next month)
- **Right main area** (flex-1): Day view for the selected date with 3 vertical sections:
  - **Top**: Recently completed tasks from previous days (grouped by date, muted/read-only)
  - **Middle**: Active day panel — current `/tasks/` style with category-grouped tasks, drag-drop, inline completions
  - **Bottom**: Upcoming tasks from future days (grouped by due date, read-only)

### 6A: Server Functions & Queries

- [x] Add `fetchTasksForDate` server function — tasks where `dueDate` falls on a given calendar day
  - Reuses `fetchInboxTasks` ordering logic (incomplete first, category sort, completed last)
- [x] Add `fetchRecentCompletedTasks` server function — tasks completed _before_ the selected date
  - Input: `{ userId, beforeDate, limit? }`, ordered by `dateCompleted DESC`, excludes subtasks
- [x] Add `fetchUpcomingTasksFromDate` server function — incomplete tasks with `dueDate > selectedDate`
  - Input: `{ userId, afterDate, limit? }`, ordered by `dueDate ASC`, excludes subtasks
- [x] Add `fetchDaysWithTasks` server function — distinct dates with tasks in a date range (for calendar dot indicators)
  - Input: `{ userId, startDate, endDate }`, returns `string[]` of date strings
- [x] Add corresponding query options in `src/features/tasks/queries.ts`
- [x] Add new query keys in `src/features/tasks/consts.ts` (`byDate`, `recentCompleted`, `upcomingFrom`, `daysWithTasks`)

### 6B: Calendar Component

- [x] Build `src/components/MiniCalendar.tsx` — custom CSS grid, no external dependencies
  - Props: `selectedDate`, `onSelectDate`, `daysWithTasks: Set<string>`
  - 3 stacked `MonthGrid` sub-components (prev month, current month, next month)
  - Indicators: **today** (ring), **selected day** (primary bg), **days with tasks** (small dot)
  - Calendar centers on the selected date's month (shifts as user navigates to different months)
  - Click a day cell → calls `onSelectDate(date)`

### 6C: Day View Panels

- [x] Build `src/components/DayView.tsx` — scrollable container with 3 vertical sections
- [x] Build `ActiveDayPanel` (middle section):
  - Reuses `CategoryGroupedList`, `TaskItem`, drag-drop, mutations from current `/tasks/` route
  - Header: formatted date (e.g., "Monday, 14 April 2026") + "+" button → `TaskDialog` with selected date pre-filled
  - Completed tasks for _that day_ appear inline (same as current behavior)
- [x] Build `RecentCompletedPanel` (top section):
  - Tasks completed before the selected date, grouped by completion date (e.g., "Yesterday", "April 8")
  - Strikethrough/muted styling, compact read-only items (no drag-drop, no edit/delete inline)
- [x] Build `UpcomingPanel` (bottom section):
  - Incomplete tasks with future due dates, grouped by due date
  - Read-only list with task title + priority dot
  - Clicking a task's date navigates to that day

### 6D: Scroll-to-Navigate

- [x] Implement scroll boundary navigation in `src/routes/index.tsx`:
  - Scroll event listener on main container detects top/bottom boundaries
  - Scroll to top → decrement `selectedDate` by 1 day; scroll to bottom → increment by 1 day
  - 300ms debounce to prevent rapid-fire day changes
  - Calendar selection updates to match

### 6E: Route Wiring & Cleanup

- [x] Update `src/routes/index.tsx` — replace `<>Yolo</>` with calendar + day view layout
  - Side-by-side: `MiniCalendar` (left) + `DayView` (right)
  - `selectedDate` state lifted here, passed to both components
  - Route loader pre-fetches today's data (tasks for date, recent completed, upcoming, days with tasks for 3 months)
- [ ] Remove or redirect `/tasks/` route to `/` (deferred — kept for now)
- [x] Responsive: calendar wrapper `hidden lg:block`, day view full width on mobile

### Decisions

- **No external calendar library** — custom CSS grid keeps bundle small, fully styled with design tokens
- **Calendar centers on selected date's month** — shifts as user navigates, not locked to today's month
- **Recently completed** = completed _before_ selected date; that day's completions stay inline in middle panel
- **`/tasks/` route removed** — all task management moves to home page (`/`)
- **Quick filter chips deferred** — not in this phase
- **Mobile calendar toggle deferred** — hidden on mobile for now

### Outputs

- `src/components/MiniCalendar.tsx`
- `src/components/DayView.tsx` (with `ActiveDayPanel`, `RecentCompletedPanel`, `UpcomingPanel`)
- Updated `src/routes/index.tsx`
- 4 new server functions + query options in `src/features/tasks/`
- Responsive layout (calendar hidden on mobile)

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
