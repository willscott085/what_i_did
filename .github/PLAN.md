# whatIdid — Master Implementation Plan

> **How to use this file**: This plan drives iterative development. Each phase is implemented one at a time, committed in small batches. AI assistants should read this file at the start of every session to understand current state. Update the status checkboxes and notes as work progresses.

## Key Decisions

| Decision        | Choice                                                     | Rationale                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend         | TanStack Start server functions + Drizzle ORM + PostgreSQL | No separate API framework — server functions already exist, just swap data layer                                                                                                                                     |
| ORM             | Drizzle                                                    | Lightweight, type-safe, SQL-like syntax                                                                                                                                                                              |
| Database        | PostgreSQL (via docker-compose)                            | Relational, full-text search built-in, dev container provides it                                                                                                                                                     |
| Data Model      | **Unified `items` table** with `type` column               | Tasks, notes, and events are all "titled things with content, a date, and tags". Behavioral differences via `type` column + conditional UI. One tag junction, one metadata table, simpler queries, future types free |
| Scheduling      | **`schedules` table** attached to any item                 | Reminders/recurrence are orthogonal to item type. A schedule attaches to any item — `cloneOnFire` for task-generating reminders, plain notify for events                                                             |
| AI Provider     | Provider-agnostic abstraction                              | Start with xAI/Grok, design to swap to OpenAI/Ollama/Anthropic. Uses `openai` SDK with custom base URL                                                                                                               |
| AI Notes        | Metadata table + PostgreSQL full-text search               | AI generates title (if none given) + keywords on save. `tsvector`/`tsquery` for search, no embeddings yet                                                                                                            |
| Auth            | Deferred (Phase 10)                                        | userId column baked in from day one, hardcode '1' for now                                                                                                                                                            |
| Tags            | Flat tag system                                            | Tags are the sole organizational mechanism — flexible, orthogonal, many-to-many                                                                                                                                      |
| Notes Format    | Tiptap rich text editor, stored as markdown                | Tiptap for editing, markdown for portable storage and full-text indexing                                                                                                                                             |
| Deployment      | Local only for now                                         | Docker Compose with PostgreSQL, simple local setup                                                                                                                                                                   |
| Codebase        | Evolve existing — don't start fresh                        | Reuse TanStack Start, React Query, dnd-kit, Tailwind foundations                                                                                                                                                     |
| Testing         | Vitest (unit/integration) + Playwright (E2E)               | Vitest already set up; Playwright pairs well with Vite stack, cross-browser, great TypeScript support                                                                                                                |
| Dev Environment | Dev container (Docker)                                     | Reproducible setup, Playwright browsers pre-installed, Codespaces-ready                                                                                                                                              |

### Simplification Decisions (Post-Phase 5)

- **Priority categories removed** — original plan had configurable priority categories (Business-Critical, Momentum Builders, etc.). Simplified to just tags for organization.
- **Recurrence removed from tasks** — tasks use `startDate` only. Recurrence lives in the `schedules` system (Phase 9) — schedules with `cloneOnFire` create fresh tasks on a schedule.
- **Lists removed** — `lists` and `listItems` tables were never implemented. Backlog + day view replaces static lists.
- **`dueDate` → `startDate`** — renamed to better reflect the concept: the day a task appears in your day view.

### Architectural Pivot (Post-Phase 7)

- **Unified `items` table** — tasks, notes, and events (reminders) were originally separate tables (`tasks`, `notes`). In Phase 8 we migrate to a single `items` table with a `type` column (`task` | `note` | `event`). This halves the schema, eliminates duplicate junction tables, and makes tag pages/day views trivial (one query instead of UNION across tables). Separate pages and UI components remain — the unification is at the data layer.
- **`schedules` replaces `reminders`** — scheduling (reminder times, RRULE recurrence, snooze) is orthogonal to item type. A `schedules` table attaches to any item. Event items + schedule = timed notification. Task items + schedule + `cloneOnFire` = recurring task generation.
- **One junction table** — `itemTags` replaces `taskTags` + `noteTags`. Same tag pool, single query.
- **One metadata table** — `itemMetadata` replaces `noteMetadata`. AI-generated keywords/embeddings can apply to any item type.

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

> Replace json-server with PostgreSQL + Drizzle ORM. All existing functionality must keep working.

- [x] Install `drizzle-orm`, `postgres`, `drizzle-kit`
- [x] Create `drizzle.config.ts` at project root
- [x] Create `src/db/schema.ts` — tables:
  - `tasks`: id, title, notes, dateCreated, dateCompleted, startDate, userId, parentTaskId (subtasks), sortOrder
  - `tags`: id, name, description, color, userId, dateCreated, updatedAt
  - `taskTags`: taskId, tagId (junction table, CASCADE deletes)
- [x] Create `src/db/index.ts` — Drizzle client singleton
- [x] Create `src/db/seed.ts` — seed script (sample tasks, tags, task-tag relationships)
- [x] Create `src/db/migrate.ts` — migration runner script
- [x] Add scripts to `package.json`: `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- [x] Generate initial migration, run it, seed data
- [x] Swap `src/features/tasks/server.ts` — replace axios calls with Drizzle queries
- [x] Update `src/features/tasks/types.ts` — Task type with startDate, subtaskCount, tags
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
- PostgreSQL database provided by docker-compose service

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

> CRUD for tasks, tags, and subtasks. Tags are the sole organizational mechanism.

- [x] Create `src/features/tags/` — types, server, queries, mutations, consts
  - CRUD server functions for tags
  - Tag creation inline (type-to-create in multi-select — TagMultiSelect component)
- [x] Expand task server functions:
  - `fetchTasks` — all tasks for user
  - `fetchInboxTasks` — root-level incomplete tasks with startDate ≤ today (auto-rolls forward stale tasks)
  - `fetchCompletedTasks` — all completed tasks, ordered by dateCompleted ASC
  - `fetchTasksForDate` — tasks where startDate falls on a given date
  - `fetchBacklogTasks` — root-level tasks with no startDate
  - `fetchTasksByTag` — all tasks with a specific tag
  - `fetchTaskWithRelations` — single task with full tags + subtasks
  - `fetchSubtasks` — direct children by parentTaskId
  - `createTask` — full creation with tags
  - `updateTask` — full update with tag sync (delete + re-insert in transaction)
  - `deleteTask` — hard delete (subtasks deleted first)
  - `completeTask` — toggle completion with timestamp
  - `updateTaskOrder` / `reorderTasks` — drag-drop ordering
- [x] Build **Create/Edit Task Dialog** (`src/components/TaskDialog.tsx`):
  - Fields: title, start date, tags (TagMultiSelect), notes (textarea)
  - Subtasks list (inline add/complete/delete — SubtaskList component, edit mode only)
  - Radix Dialog wrapper
  - Fetches full task via `fetchTaskQueryOptions(task.id)` when editing to load tags
- [x] Build **SubtaskList** component — single-level only (subtasks cannot have subtasks)
- [x] Build **TagMultiSelect** component — multi-select with inline tag creation
- [x] Update `TaskItem.tsx`:
  - Tag badges before title
  - Subtask count badge with expand/collapse (lazy-load subtasks on expand)
  - Edit button → opens TaskDialog; Delete button → hard delete
  - Notes preview below task title (max 3 lines, `line-clamp-3`, `break-all` for long URLs)
  - URLs in notes auto-linkified (clickable `<a>` tags via `Linkify` component)
  - Notes hidden for completed tasks
  - Click-to-copy on completed tasks (copies title to clipboard with sonner toast)
- [x] Update seed data — tags, task-tag relationships, subtasks
- [x] **Verify**: `pnpm typecheck` passes — zero errors
- [x] **Verify**: `pnpm test` passes — existing unit tests still green
- [x] **Verify**: `pnpm db:seed` runs successfully

### Decisions

- **Task deletion**: Hard delete (no soft delete)
- **Subtask depth**: Single level only (subtasks cannot have subtasks)
- **No priority categories**: Simplified from original plan — tags serve this purpose
- **No recurrence**: Removed from scope — tasks use `startDate` only
- **No lists**: Backlog + day view replaces static lists

### Outputs

- `src/features/tags/` (types, consts, server, queries, mutations)
- `src/components/TaskDialog.tsx`, `SubtaskList.tsx`, `TagMultiSelect.tsx`
- Updated `src/components/TaskItem.tsx`, `src/db/seed.ts`
- Updated `src/features/tasks/` (types, server, consts, queries, mutations)

---

## Phase 6: Calendar + Day View UI ✅

> The main app interface — a mini calendar sidebar with a day view for the selected date.

### Layout

- **Left sidebar** (fixed ~240px, hidden on mobile): 3-month stacked mini calendar (prev/current/next month)
- **Top nav**: Links to Tags and Backlog views
- **Main area** (flex-1, max-w-2xl centered): Day view for the selected date — sortable task list with drag-drop, inline completions, subtask expansion

### 6A: Server Functions & Queries

- [x] Add `fetchTasksForDate` server function — tasks where `startDate` falls on a given calendar day
  - Includes auto-roll-forward of stale tasks (gated to only run when date = today)
- [x] Add `fetchBacklogTasks` server function — root-level tasks with no `startDate`
- [x] Add `fetchTasksByTag` server function — tasks with a specific tag
- [x] Add corresponding query options in `src/features/tasks/queries.ts`
- [x] Add new query keys in `src/features/tasks/consts.ts` (`byDate`, `backlog`, `byTag`)

### 6B: Calendar Component

- [x] Build `src/components/MiniCalendar.tsx` — custom CSS grid, no external dependencies
  - Props: `selectedDate`, `onSelectDate`, `dragOverDate`
  - 3 stacked `MonthGrid` sub-components (prev month, current month, next month)
  - Indicators: **today** (ring), **selected day** (primary bg)
  - Calendar centers on the selected date's month
  - Click a day cell → navigates to `/day/$date`
  - "Today" button to jump back to current date

### 6C: Day View

- [x] Build `src/components/DayView.tsx` — single sortable task list for the selected date
  - Header: formatted date (e.g., "Monday, 14 April 2026") + "+" button → TaskDialog with date pre-filled
  - `SortableTaskList` with drag-drop reordering
  - Completed tasks appear inline with strikethrough styling
  - Incomplete/completed split within the same list

### 6D: Routes

- [x] Create `/day/$date` route (`src/routes/_app/day/$date.tsx`) — date param drives task fetching and page title
- [x] Index route (`/_app/`) redirects to `/day/{today}` via `beforeLoad` + `throw redirect`
- [x] Create `/backlog` route (`src/routes/_app/backlog.tsx`) — tasks with no startDate, sortable
- [x] Create `/tags` route (`src/routes/_app/tags.tsx`) — tag list with search filter
- [x] Create `/tag/$tagId` route (`src/routes/_app/tag/$tagId.tsx`) — tag detail with inline name/description editing, shows tasks with this tag
- [x] Responsive: calendar sidebar `hidden lg:block`, day view full width on mobile

### Decisions

- **No external calendar library** — custom CSS grid keeps bundle small, fully styled with design tokens
- **Calendar centers on selected date's month** — shifts as user navigates
- **URL-driven dates** — `/day/$date` is the source of truth for selected date (no local state)
- **Simplified DayView** — single sortable list per day, no three-panel layout (recent/active/upcoming panels were cut)
- **Scroll-to-navigate removed** — day changes happen via calendar clicks or URL navigation only

### Outputs

- `src/components/MiniCalendar.tsx`
- `src/components/DayView.tsx`
- `src/routes/_app/day/$date.tsx`, `src/routes/_app/backlog.tsx`, `src/routes/_app/tags.tsx`, `src/routes/_app/tag/$tagId.tsx`
- `src/routes/_app/index.tsx` (redirect to today)
- `src/routes/_app.tsx` (app layout with sidebar, nav, dialog state)
- `src/components/AppLayoutContext.tsx` (drag state, default start date, dialog handlers)
- Server functions + query options for by-date, backlog, by-tag queries

---

## Phase 6F: Simplification & Bug Fixes ✅

> Tag fixes, ordering consistency, UX polish, and sonner toast integration.

### Tag Fixes

- [x] Fix `tagNames` subquery in `taskColumns` — Drizzle `${tasks.id}` resolved to unqualified `"id"` in subqueries, causing `GROUP_CONCAT` to always return null. Fixed by hardcoding `"tasks"."id"` in the SQL template.
- [x] Fix `TaskDialog` not loading tags when editing — list queries return plain `Task` objects without tags. Dialog now fetches the full task via `fetchTaskQueryOptions(task.id)` when opened for edit.
- [x] Display tag badges on `TaskItem` — small muted badges rendered before the title input.

### Ordering Consistency

- [x] Standardize completed task ordering — all queries now use `asc(tasks.dateCompleted)` (most recently completed last).
- [x] Remove redundant client-side sort in `SortableTaskList` — was re-sorting completed tasks client-side which conflicted with server order during hydration.

### Side Effect Fix

- [x] Gate `rollForwardStaleTasks()` in `fetchTasksForDate` — only runs when `data.date` equals today. Previously, opening any past date would mutate incomplete tasks' start dates as a side effect.

### UX Improvements

- [x] Click-to-copy on completed tasks — clicking a completed task's label copies text to clipboard with a sonner toast confirmation.
- [x] Install `sonner` toast library — `<Toaster>` added to `__root.tsx` at bottom-center position.
- [x] Native `title` attribute on task title input for browser tooltip on hover.

### Outputs

- Updated: `src/components/TaskItem.tsx`, `src/components/TaskDialog.tsx`, `src/components/SortableTaskList.tsx`
- Updated: `src/features/tasks/server.ts`, `src/features/tasks/queries.ts`, `src/features/tasks/consts.ts`
- Updated: `src/routes/__root.tsx` (sonner Toaster)
- Added dependency: `sonner`

---

## Phase 7: Notes System + AI Integration

> Quick-capture notes with Tiptap editing, AI auto-titling via Grok, and keyword search. Notes share the same tag pool as tasks via a separate `noteTags` junction table. Notes display in day view, tag view, and a dedicated `/notes` route.

### 7A: Database & Feature Scaffold

- [ ] Add to `src/db/schema.ts`:
  - `notes`: id (`nte_` prefix), content (text, markdown from Tiptap), title (text, nullable — user-provided or AI-generated), date (text, nullable — display date for day view, updated by drag-to-calendar), sortOrder (integer, default 0), userId, dateCreated, dateUpdated
  - `noteTags`: noteId (FK → notes.id CASCADE), tagId (FK → tags.id CASCADE), composite PK — mirrors `taskTags` pattern, same tags pool
  - `noteMetadata`: noteId (FK → notes.id CASCADE, PK — one-to-one), keywords (text, nullable — AI-generated comma-separated search terms), embedding (blob, nullable — future vector search)
- [ ] Add relations: `notesRelations` (many noteTags, one noteMetadata), `noteTagsRelations`, `noteMetadataRelations`. Update `tagsRelations` to include `noteTags`
- [ ] Generate migration (`pnpm db:generate`), run it (`pnpm db:migrate`)
- [ ] Create `src/features/notes/` — types, consts, server, queries, mutations
- [ ] Update `src/db/seed.ts` with sample notes, note-tag relationships, and noteMetadata

### 7B: Server Functions

- [ ] CRUD in `src/features/notes/server.ts`:
  - `fetchNotes(userId, { page, limit })` — paginated, 50/page, ordered by dateUpdated DESC. Returns `{ notes, total, page, totalPages }`
  - `fetchNotesForDate(userId, date)` — notes where `date` = given date, ordered by sortOrder
  - `fetchNotesByTag(userId, tagId)` — notes with a specific tag (mirrors `fetchTasksByTag`)
  - `fetchNote(userId, noteId)` — single note with tags + metadata
  - `createNote({ content, title?, date?, tagIds? })` — creates note + noteTags. Triggers AI processing if title is null
  - `updateNote({ id, content?, title?, date?, tagIds?, sortOrder? })` — tag sync in transaction (same pattern as `updateTask`)
  - `deleteNote(noteId)` — hard delete (CASCADE handles noteTags + noteMetadata)
  - `reorderNotes(noteIds)` — batch reorder by position (mirrors `reorderTasks`)
  - `searchNotes(userId, query, tagIds?)` — PostgreSQL full-text search (`tsvector`/`tsquery`) + optional tag filter
- [ ] Set up PostgreSQL full-text search on notes:
  - `tsvector` column on notes or use `to_tsvector()` at query time on content + title + keywords
  - `searchNotes` uses `plainto_tsquery` with `ts_rank` for relevance ranking
  - Combine with tag filtering via `noteTags` join

### 7C: AI Integration (Provider-Agnostic)

- [ ] Create `src/features/ai/`:
  - `types.ts` — `AIProvider` interface: `generateTitle(content)`, `generateKeywords(content)`
  - `xai.ts` — xAI/Grok implementation using `openai` npm package with base URL `https://api.x.ai/v1`
  - `provider.ts` — factory function `getAIProvider()` reads `AI_PROVIDER` env var, returns implementation
  - Easy to add `openai.ts`, `ollama.ts`, `anthropic.ts` by implementing the interface
- [ ] Add env vars to `src/config/env.server.ts`:
  - `AI_API_KEY` (optional — AI features degrade gracefully if missing)
  - `AI_PROVIDER` (optional, default: `xai`)
- [ ] `processNoteWithAI(noteId)` server function — fire-and-forget after save:
  - **Title**: only generated if `note.title` is null/empty (user-provided title never overwritten)
  - **Keywords**: always generated — 5-10 terms including synonyms, related concepts, contextual terms
  - Updates `notes.title` (if was null) and `noteMetadata.keywords`
  - Graceful degradation: no API key → skip silently

### 7D: UI Components

- [ ] Install Tiptap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
  - Markdown serialization for storage (store as markdown, edit as rich text)
- [ ] Build `src/components/NoteItem.tsx` — mirrors TaskItem layout:
  - Drag handle (`GripVertical`, visible on hover — same as TaskItem)
  - Note icon (`StickyNote` or `FileText` from lucide) instead of checkbox
  - Title as primary text (AI-generated or user-provided, "Processing..." while AI pending)
  - Content truncated to 1-2 lines (`line-clamp-2`), chevron expands full content inline
  - Tag badges (same styling as TaskItem)
  - Edit button → NoteDialog, Delete button
- [ ] Build `src/components/NoteDialog.tsx` — create/edit dialog:
  - Content: Tiptap editor (main field, autofocus)
  - Title: text input (optional — placeholder "AI will generate a title")
  - Date: date input (pre-filled from context)
  - Tags: `TagMultiSelect` (reused directly)
  - On create: save, trigger AI if no title
  - On edit: update, re-trigger AI if content changed and title was AI-generated
- [ ] Hot corner button — fixed bottom-right, muted gray, `StickyNote` icon:
  - On `/day/$date` → pre-fills date
  - On `/tag/$tagId` → pre-fills tag
  - Keyboard shortcut: Cmd/Ctrl+N with same context rules

### 7E: Routes & View Integration

- [ ] Update `src/components/DayView.tsx`:
  - Fetch notes for date alongside tasks
  - Render notes section (each as `NoteItem`) with drag-drop reordering
  - Drag note to calendar date → updates `date` field
- [ ] Update `src/routes/_app/tag/$tagId.tsx`:
  - Fetch + render notes by tag alongside tasks
- [ ] Add `/notes` route (`src/routes/_app/notes.tsx`):
  - Search bar (full-text search, debounced)
  - Tag filter (multi-select)
  - Paginated note list: 50 per page, ordered by dateUpdated DESC
  - Each result as `NoteItem`
- [ ] Update app layout (`src/routes/_app.tsx`):
  - "Notes" nav link
  - Note dialog state in `AppLayoutContext`
  - Hot corner button
  - Cmd/Ctrl+N keyboard shortcut

### 7F: Testing & Verification

- [ ] Unit tests: `src/features/notes/mutations.test.ts`, `src/features/ai/xai.test.ts`
- [ ] E2E: `e2e/notes.spec.ts` — create note, verify in day view, expand, search
- [ ] **Verify**: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all pass
- [ ] **Verify**: `pnpm db:seed` creates sample notes with tags and metadata

### Decisions

- **Separate `noteTags` table** — same tags pool as tasks, clean FK constraints, no polymorphic complexity
- **`noteMetadata` table** — isolates AI-generated data (keywords, future embeddings), extensible
- **AI title only if none given** — user intent takes precedence
- **No AI tag suggestions** — avoids sending full tag list on every AI request
- **`date` field** (not `startDate`) — display-only for day view, updated by drag-to-calendar
- **Drag handles on notes** — reorderable within day view, draggable to calendar dates
- **Tiptap + markdown storage** — rich editing, portable storage, full-text searchable
- **PostgreSQL full-text search + AI keywords** — AI generates search terms at save time, `tsvector`/`tsquery` at query time, no API calls needed for search
- **Tasks ↔ Notes linked only via shared tags** — no direct FK
- **Provider-agnostic AI** — interface in `types.ts`, xAI implementation first. `openai` npm package works with xAI's OpenAI-compatible API
- **Pagination on `/notes`** — 50 per page to prevent slow loads

### Outputs

- `src/db/schema.ts` — notes, noteTags, noteMetadata tables + relations
- `src/features/notes/` — types, consts, server, queries, mutations
- `src/features/ai/` — types, provider, xai, config
- `src/components/NoteItem.tsx`, `NoteDialog.tsx`
- `src/routes/_app/notes.tsx`
- Updated: `DayView.tsx`, `tag/$tagId.tsx`, `_app.tsx`, `AppLayoutContext.tsx`
- Tiptap integration (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`)

---

## Phase 8: Unified Items Architecture (Migration)

> Migrate from separate `tasks`/`notes` tables to a single `items` table with a `type` column. This unifies the data layer — tasks, notes, and the new event type all become items. All existing pages, routes, and UI components remain separate. Data is migrated without loss.

### Why Now

The app has a small dataset, the schema is young, and we're about to add a third entity type (events/reminders). Adding another set of tables + junction table + server functions would triple the boilerplate. A unified model means:

- **One tag junction** (`itemTags`) instead of three (`taskTags`, `noteTags`, `reminderTags`)
- **Tag page is one query** — no UNION across three tables
- **Day view is one query** — filter by date, get tasks + notes + events together
- **Future types are free** — habits, bookmarks, etc. require zero new tables
- **Half the server functions** — one CRUD set with type filters

### 8A: New Schema

- [ ] Create `items` table in `src/db/schema.ts`:
  - `id` (text PK — prefixed: `tsk_`, `nte_`, `evt_` by type)
  - `type` (text NOT NULL — `task` | `note` | `event`)
  - `title` (text NOT NULL)
  - `content` (text, nullable — task notes, note body, event description)
  - `date` (text, nullable — `startDate` for tasks, display date for notes, event date)
  - `dateCompleted` (text, nullable — tasks only)
  - `parentItemId` (text, nullable — self-ref FK for subtasks)
  - `sortOrder` (text NOT NULL, default `'a0'` — fractional indexing)
  - `userId` (text NOT NULL)
  - `dateCreated` (text NOT NULL)
  - `dateUpdated` (text NOT NULL)
- [ ] Create `itemTags` junction table:
  - `itemId` (text FK → items.id CASCADE)
  - `tagId` (text FK → tags.id CASCADE)
  - Composite PK (itemId, tagId)
- [ ] Create `itemMetadata` table (replaces `noteMetadata`):
  - `itemId` (text PK, FK → items.id CASCADE — one-to-one)
  - `keywords` (text, nullable — AI-generated)
  - `embedding` (bytea, nullable — future vector search)
- [ ] Add relations: `itemsRelations` (self-ref subtasks, many itemTags, one itemMetadata, many schedules), `itemTagsRelations`, `itemMetadataRelations`. Update `tagsRelations` to reference `itemTags`.
- [ ] Keep `tags` table unchanged — tags are already clean

### 8B: Data Migration

- [ ] Write Drizzle migration that:
  1. Creates `items`, `itemTags`, `itemMetadata` tables
  2. Copies `tasks` → `items` with `type = 'task'`:
     - `id` → `id` (keep existing IDs)
     - `title` → `title`
     - `notes` → `content`
     - `startDate` → `date`
     - `dateCompleted` → `dateCompleted`
     - `parentTaskId` → `parentItemId`
     - `sortOrder` → `sortOrder` (already text)
     - `dateCreated` → `dateCreated`
     - Set `dateUpdated` = `dateCreated` (tasks didn't track this)
  3. Copies `notes` → `items` with `type = 'note'`:
     - `id` → `id`
     - `title` → `title` (nullable → use `'Untitled'` fallback)
     - `content` → `content`
     - `date` → `date`
     - `sortOrder` → `sortOrder` (convert integer to text: `CAST(sort_order AS TEXT)`)
     - `dateCreated` → `dateCreated`, `dateUpdated` → `dateUpdated`
  4. Copies `taskTags` → `itemTags` (taskId → itemId)
  5. Copies `noteTags` → `itemTags` (noteId → itemId)
  6. Copies `noteMetadata` → `itemMetadata` (noteId → itemId)
  7. Drops old tables: `tasks`, `notes`, `taskTags`, `noteTags`, `noteMetadata`
- [ ] Create `src/db/migrate-data.ts` — standalone migration script (can be run independently, idempotent)
- [ ] Test migration locally: `pnpm db:generate && pnpm db:migrate` — verify zero data loss
- [ ] Update `src/db/seed.ts`:
  - Seed items of all three types (tasks, notes, events)
  - Seed itemTags for all types
  - Seed itemMetadata for notes

### 8C: Update Feature Modules

- [ ] Create `src/features/items/` — shared base layer:
  - `types.ts` — `Item` base type, `ItemType` enum (`task` | `note` | `event`), `Task`/`Note`/`Event` narrowed types (discriminated union on `type`)
  - `consts.ts` — query keys: `{ all: ['items'], byType: ['items', type], byId: ['items', id], byDate: ['items', 'date', date], byTag: ['items', 'tag', tagId] }`
  - `server.ts` — unified CRUD server functions:
    - `fetchItems(userId, { type?, date?, tagId?, completed?, parentId?, page?, limit? })` — flexible query with type/date/tag filters
    - `fetchItem(userId, itemId)` — single item with tags + metadata
    - `createItem({ type, title, content?, date?, tagIds?, parentItemId? })` — creates item + itemTags, auto-generates prefixed ID
    - `updateItem({ id, ...fields, tagIds? })` — tag sync in transaction
    - `deleteItem(itemId)` — hard delete (CASCADE handles tags + metadata)
    - `completeItem(itemId)` — toggle dateCompleted (tasks only)
    - `reorderItems(itemIds)` — batch reorder
  - `queries.ts` — React Query option factories wrapping server functions
  - `mutations.ts` — React Query mutations with optimistic updates
- [ ] Update `src/features/tasks/` — thin adapter layer over items:
  - `server.ts` — task-specific server functions that call unified `fetchItems` with `type: 'task'`:
    - `fetchTasks`, `fetchTasksForDate`, `fetchBacklogTasks`, `fetchTasksByTag`, `fetchCompletedTasks`, etc.
    - These delegate to `fetchItems` with appropriate filters — keeps route loaders and queries unchanged
  - `types.ts` — `Task` type (narrowed from `Item` where `type === 'task'`)
  - `queries.ts` / `mutations.ts` — keep existing query keys + function signatures, rewire to unified layer
  - Existing routes and components continue importing from `features/tasks/` — no route changes needed
- [ ] Update `src/features/notes/` — same thin adapter pattern:
  - `server.ts` — note-specific functions delegating to unified layer with `type: 'note'`
  - `types.ts` — `Note` type narrowed from `Item`
  - `queries.ts` / `mutations.ts` — rewire to unified layer
  - `searchNotes` — full-text search on items where `type = 'note'`, using content + title + metadata keywords
- [ ] Create `src/features/events/` — new adapter for event items:
  - `types.ts` — `Event` type narrowed from `Item` where `type === 'event'`
  - `server.ts` — event-specific functions: `fetchEvents`, `fetchEventsByTag`, etc.
  - `queries.ts` / `mutations.ts`

### 8D: Update Components

- [ ] Update `src/components/TaskItem.tsx` — import `Task` from updated types (no visual changes)
- [ ] Update `src/components/TaskDialog.tsx` — use updated create/update mutations
- [ ] Update `src/components/NoteItem.tsx` — import `Note` from updated types
- [ ] Update `src/components/NoteDialog.tsx` — use updated mutations
- [ ] Update `src/components/SubtaskList.tsx` — uses items with `parentItemId`
- [ ] Update `src/components/DayView.tsx` — single query for all items on date, render by type
- [ ] Update `src/components/SortableTaskList.tsx` / `SortableList.tsx` — work with unified item types
- [ ] Update `src/components/TagMultiSelect.tsx` — uses `itemTags` (no visible change)

### 8E: Update Routes

- [ ] Update all route loaders to use new query options:
  - `/day/$date` — fetch items for date (all types)
  - `/backlog` — fetch items where type='task' and date is null
  - `/notes` — fetch items where type='note', paginated
  - `/tags` — unchanged (tags table didn't change)
  - `/tag/$tagId` — fetch items by tag (all types in one query)
- [ ] All routes keep their current paths and visual layouts
- [ ] Verify route loaders use `ensureQueryData` with new query option factories

### 8F: Testing & Verification

- [ ] Update MSW handlers in `src/tests/mock/handlers.ts` for new data shapes
- [ ] Update existing unit tests — rewire to unified item types
- [ ] Run data migration on real dev database — verify all tasks, notes, tags preserved
- [ ] **Verify**: `pnpm typecheck` passes — zero errors
- [ ] **Verify**: `pnpm test` passes — all unit tests green
- [ ] **Verify**: `pnpm test:e2e` passes — all existing E2E tests green (tasks, notes, tags, backlog, subtasks, navigation)
- [ ] **Verify**: `pnpm db:seed` works with new schema

### Decisions

- **Unified `items` table** — structural clarity traded for behavioral complexity (`if type === 'task'` branches), but reduces schema from 6 tables + 3 junctions to 3 tables + 1 junction
- **Thin adapter layers** — `features/tasks/` and `features/notes/` remain as facades. Routes and components don't know about the unified table — they import from the same feature modules as before
- **Keep prefixed IDs** — `tsk_`, `nte_`, `evt_` prefixes on `items.id` make type identifiable from ID alone (useful for debugging, URLs, logging)
- **`dateUpdated` added to tasks** — tasks previously lacked this; migration backfills with `dateCreated`
- **`sortOrder` standardized to text** — notes used integer, tasks used text (fractional indexing). Migration converts note sort orders to text
- **`title` is NOT NULL** — notes that had null titles get `'Untitled'` during migration. AI can still overwrite `'Untitled'`
- **Drop old tables in same migration** — data volume is small, migration is tested locally first, rollback is a re-seed

### Outputs

- `src/db/schema.ts` — `items`, `itemTags`, `itemMetadata` tables + relations (old tables removed)
- `src/features/items/` — types, consts, server, queries, mutations (new shared base layer)
- `src/features/tasks/` — updated to delegate to items layer
- `src/features/notes/` — updated to delegate to items layer
- `src/features/events/` — new adapter for event items
- Drizzle migration: data migration SQL + table drops
- Updated: components, routes, MSW handlers, seed data, tests

---

## Phase 9: Reminders & Notifications

> Recurring and one-off reminders with system notifications, snooze, and task generation — built on the unified items architecture. **Split into six sub-phases (9A–9F), each independently shippable and testable.** Each sub-phase is a commit-sized chunk that leaves the app in a working state.

### Key Concepts

- **Event item** — an item with `type: 'event'`. Stands on its own in the reminders page. "Team standup" or "Take a break".
- **Schedule** — a timing attachment on any item. Defines when to fire (reminderTime), recurrence (RRULE), and behavior (notify only vs clone-as-task).
- **`cloneOnFire`** — when a schedule fires with `cloneOnFire: true`, it creates a new task item with the parent item's title/tags and `date = today`. "Water plants every 3 days" → event item + schedule with cloneOnFire → fresh completable task each time.
- **Any item can have a schedule** — set a reminder on a task ("remind me about this task tomorrow"), on a note ("review this note Friday"), or on an event (the default — standalone timed notification).

### Lessons Learned (from failed first attempt)

- **Don't create all feature code at once** — the events adapter, schedules feature, recurrence engine, UI components, route, and nav changes were attempted in a single pass. This created too many interdependencies and broke the app.
- **TanStack Start server functions** are the data layer — they call Drizzle directly. No HTTP layer, no REST endpoints. Each server function is `createServerFn()` with a Zod input validator and a `.handler()` that returns Drizzle query results.
- **Thin adapter pattern** — `features/tasks/` and `features/notes/` are facades over the unified `items` table. They each define their own `server.ts` with type-filtered queries, `types.ts` with narrowed types, and `queries.ts`/`mutations.ts` for React Query integration. `features/events/` should follow the exact same pattern.
- **Route loaders** use `ensureQueryData` with query option factories from `queries.ts`. Components use `useSuspenseQuery` with the same options.
- **DB tables already exist** — `schedules`, `scheduleHistory`, and `pushSubscriptions` were created in a prior migration. No schema changes needed.
- **Build vertically, not horizontally** — implement one complete slice (server → queries → mutations → component → route integration) before starting the next.

---

### Phase 9A: Events Feature Module (Data Layer Only)

> Create the thin events adapter over the unified items table. No UI, no routes — just the data layer following the exact same pattern as `features/tasks/` and `features/notes/`.

- [ ] Create `src/features/events/types.ts`:
  - `Event` type (narrowed from `Item` where `type === 'event'`)
  - `EventWithSchedule` type — event with its attached schedule(s)
- [ ] Create `src/features/events/consts.ts`:
  - Query keys: `eventsQueryKeys` (all, byId, byDate, byTag)
- [ ] Create `src/features/events/server.ts`:
  - `fetchEvents(userId)` — all events, ordered by dateCreated DESC
  - `fetchEventsForDate(userId, date)` — events where `date` matches
  - `fetchEventsByTag(userId, tagId)` — events with a specific tag
  - `fetchEvent(userId, eventId)` — single event with tags
  - `createEvent({ title, content?, date?, tagIds? })` — creates item with `type: 'event'`, `evt_` prefixed ID
  - `updateEvent({ id, title?, content?, date?, tagIds? })` — tag sync in transaction
  - `deleteEvent(eventId)` — hard delete
- [ ] Create `src/features/events/queries.ts` — React Query option factories wrapping server functions
- [ ] Create `src/features/events/mutations.ts` — React Query mutations with optimistic updates (same pattern as tasks/notes)
- [ ] Update `src/db/seed.ts` — add sample event items (2-3 events with tags)
- [ ] **Verify**: `pnpm typecheck` passes
- [ ] **Verify**: `pnpm test` passes (no regressions)
- [ ] **Verify**: `pnpm db:seed` creates sample events

#### Outputs

- `src/features/events/` — types, consts, server, queries, mutations
- Updated: `src/db/seed.ts`

---

### Phase 9B: Schedules Feature Module (CRUD + RRULE)

> Create the schedules data layer — server functions for schedule CRUD, plus the RRULE recurrence engine. No UI yet — this is purely the data + logic layer.

- [x] Install `rrule` npm package
- [x] Create `src/features/schedules/types.ts`:
  - `Schedule` type matching the `schedules` DB table
  - `ScheduleHistory` type matching `scheduleHistory` DB table
  - `ScheduleStatus` union: `'active' | 'snoozed' | 'dismissed' | 'completed'`
  - `RecurrencePattern` type — UI-friendly representation (freq, interval, byDay, etc.)
- [x] Create `src/features/schedules/consts.ts`:
  - Query keys: `schedulesQueryKeys` (all, byId, byItem, upcoming, recurring)
  - `SNOOZE_DURATIONS` — preset snooze options (5m, 15m, 1h, tomorrow 9am)
- [x] Create `src/features/schedules/recurrence.ts`:
  - `getNextOccurrence(rruleStr, after?)` — next fire time from RRULE
  - `getOccurrences(rruleStr, from, to)` — occurrences in a date range
  - `buildRRule(pattern: RecurrencePattern)` — construct RRULE string from UI-friendly pattern
  - `describeRRule(rruleStr)` — human-readable description ("Every Monday and Wednesday")
- [x] Create `src/features/schedules/server.ts` — CRUD server functions:
  - `fetchSchedules(userId)` — all active schedules with their item titles, ordered by reminderTime ASC
  - `fetchUpcomingSchedules(userId, limit?)` — active where reminderTime > now
  - `fetchSchedulesForItem(itemId)` — schedules attached to a specific item
  - `createSchedule({ itemId, reminderTime, rrule?, cloneOnFire? })` — attach schedule to item
  - `updateSchedule({ id, reminderTime?, rrule?, cloneOnFire? })` — update timing/behavior
  - `deleteSchedule(scheduleId)` — hard delete
  - `snoozeSchedule(scheduleId, duration)` — set snoozedUntil, status → `snoozed`
  - `dismissSchedule(scheduleId)` — one-off: status → `dismissed`. Recurring: advance to next occurrence
  - `fireSchedule(scheduleId)` — execute schedule action:
    - If `cloneOnFire` → create new task item with parent's title + tags, `date = today`. Log to `scheduleHistory` as `task_created`
    - If not `cloneOnFire` → log as `notified`
    - If recurring → calculate next occurrence, update `reminderTime`
    - If one-off → status → `completed`
  - `createEventWithSchedule(...)` — convenience: create event item + schedule in one transaction
- [x] Create `src/features/schedules/queries.ts` — React Query option factories
- [x] Create `src/features/schedules/mutations.ts` — React Query mutations with optimistic updates
- [x] Update `src/db/seed.ts` — add sample schedules: one-off event schedule, recurring event with cloneOnFire, reminder on an existing task
- [x] Unit tests: `src/features/schedules/recurrence.test.ts` — RRULE parsing, next occurrence calculation, human descriptions
- [x] **Verify**: `pnpm typecheck` passes
- [x] **Verify**: `pnpm test` passes

#### Outputs

- `src/features/schedules/` — types, consts, recurrence, server, queries, mutations
- `src/features/schedules/recurrence.test.ts`
- Updated: `src/db/seed.ts`
- Dependency: `rrule`

---

### Phase 9C: Reminders Page + Basic UI

> Build the `/reminders` route and the core UI components. This is the first visible change — users can see, create, edit, and delete reminders. No push notifications yet — just CRUD and display.

- [ ] Build `src/components/ReminderItem.tsx` — list item for reminders:
  - Bell icon (plain event) or checkbox-clock icon (cloneOnFire)
  - Title as primary text
  - Next occurrence datetime (relative: "in 2 hours", "tomorrow at 9am")
  - Recurrence badge if recurring (human-readable via `describeRRule`)
  - Tag badges (same styling as TaskItem)
  - Actions: Edit, Delete
  - Missed indicator for past-due (muted "Overdue" badge)
- [ ] Build `src/components/RecurrencePicker.tsx` — embedded in ReminderDialog:
  - Preset buttons: None, Daily, Weekly, Monthly, Custom
  - Weekly → day-of-week checkboxes (Mon–Sun)
  - Monthly → day-of-month select
  - Custom → interval number + unit (days/weeks/months)
  - Human-readable preview below
- [ ] Build `src/components/ReminderDialog.tsx` — create/edit reminder:
  - **Title** (text input, required)
  - **Description** (textarea, optional → stored as `content`)
  - **Generates task** toggle — sets `cloneOnFire`. Explanation: "Creates a new task each time this fires"
  - **Date & Time** picker (required — `reminderTime`)
  - **RecurrencePicker** component
  - **Tags** — `TagMultiSelect` (reused)
  - On save: calls `createEventWithSchedule` or updates existing
- [ ] Create `/reminders` route (`src/routes/_app/reminders.tsx`):
  - Upcoming section: chronological list of events with active schedules, grouped by day (Today, Tomorrow, This Week, Later)
  - "+" button → ReminderDialog
  - Route loader: `ensureQueryData` for upcoming schedules
  - Page head: `title: "Reminders - whatIdid"`
- [ ] Update `src/routes/_app.tsx`:
  - Add "Reminders" to `navItems`: `{ to: '/reminders', label: 'Reminders' }`
- [ ] Update `src/components/AppLayoutContext.tsx`:
  - Add `reminderDialogOpen`, `editingEvent`, `handleOpenReminderDialog` to layout context
- [ ] **Verify**: `pnpm typecheck` passes
- [ ] **Verify**: `pnpm test` passes
- [ ] **Verify**: `pnpm test:e2e` passes (existing tests — no new E2E yet)
- [ ] **Verify**: Can create, view, edit, and delete reminders via the UI

#### Outputs

- `src/components/ReminderItem.tsx`, `ReminderDialog.tsx`, `RecurrencePicker.tsx`
- `src/routes/_app/reminders.tsx`
- Updated: `_app.tsx`, `AppLayoutContext.tsx`

---

### Phase 9D: Snooze, Dismiss & Schedule Actions

> Add snooze/dismiss actions to reminders, the "Past" view, and integration with the tag page. This builds on the CRUD from 9C to add schedule lifecycle management.

- [ ] Build `src/components/SnoozeMenu.tsx` — dropdown with preset options:
  - 5 min, 15 min, 1 hour, Tomorrow 9am
  - Calls `snoozeSchedule` mutation
- [ ] Update `src/components/ReminderItem.tsx`:
  - Add Snooze dropdown (SnoozeMenu component)
  - Add Dismiss/Complete action (one-off → dismiss, recurring → advance)
  - Show snoozed state ("Snoozed until 3:30pm")
- [ ] Update `/reminders` route — add Past section:
  - Paginated history from `scheduleHistory`, ordered by firedAt DESC
  - Shows action taken (notified, task_created, snoozed, dismissed)
  - Links to created tasks when action was `task_created`
- [ ] Update `src/routes/_app/tag/$tagId.tsx`:
  - Events with schedules render using `ReminderItem`
  - Items with schedules (tasks/notes) show a small bell indicator
- [ ] E2E test: `e2e/reminders.spec.ts`:
  - Create a one-off reminder, verify it appears in upcoming
  - Create a recurring reminder, verify recurrence description
  - Snooze a reminder, verify state change
  - Dismiss a reminder, verify it moves to past
  - Navigate to /reminders from nav
- [ ] **Verify**: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all pass

#### Outputs

- `src/components/SnoozeMenu.tsx`
- Updated: `ReminderItem.tsx`, `reminders.tsx`, `tag/$tagId.tsx`
- `e2e/reminders.spec.ts`

---

### Phase 9E: Schedule-on-Item Integration

> Allow setting reminders on existing tasks and notes from their edit dialogs. Also add keyboard shortcut for quick reminder creation.

- [ ] Add "Set Reminder" section to `TaskDialog.tsx`:
  - Collapsible section with datetime + optional recurrence
  - Creates a schedule attached to the task item (no new event created)
  - Shows existing schedules on the task if any
- [ ] Add "Set Reminder" section to `NoteDialog.tsx`:
  - Same pattern — schedule attached to the note item
- [ ] Add bell indicator on `TaskItem.tsx` for tasks that have schedules
- [ ] Add bell indicator on `NoteItem.tsx` for notes that have schedules
- [ ] Add keyboard shortcut: Cmd/Ctrl+R → open ReminderDialog (in `_app.tsx`)
- [ ] **Verify**: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all pass

#### Outputs

- Updated: `TaskDialog.tsx`, `NoteDialog.tsx`, `TaskItem.tsx`, `NoteItem.tsx`, `_app.tsx`

---

### Phase 9F: Push Notifications & Server-Side Scheduler

> The final piece — system-level push notifications and the server-side scheduler that fires due schedules. This is the most complex sub-phase but is isolated from all previous UI work.

- [ ] Generate VAPID key pair, store in env vars
- [ ] Install `web-push` npm package
- [ ] Add env vars to `src/config/env.server.ts`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] Add `VAPID_PUBLIC_KEY` to `src/config/env.client.ts`
- [ ] Server functions for push subscriptions:
  - `subscribePush({ endpoint, p256dh, auth })` — save to `pushSubscriptions`
  - `unsubscribePush(endpoint)` — remove subscription
- [ ] Create `src/features/schedules/push.ts` — `sendPushNotification(userId, { title, body, url? })` using `web-push`
- [ ] Create `src/features/schedules/scheduler.ts` — server-side schedule checker:
  - Runs on an interval (every 30s) checking for due schedules
  - Query: `WHERE (reminderTime <= now OR snoozedUntil <= now) AND status IN ('active', 'snoozed')`
  - For each due schedule: call `fireSchedule()`, then `sendPushNotification()`
  - Handles missed schedules (fires immediately on next check)
- [ ] Integrate scheduler into app bootstrap (server-side only)
- [ ] In-app foreground detection:
  - App focused → show sonner toast with snooze/dismiss actions
  - App in background → Web Push notification
  - Use `document.visibilityState` to determine foreground state
- [ ] Create `public/notification-sw.js` — notification service worker:
  - `push` event → `self.registration.showNotification()`
  - `notificationclick` → `clients.openWindow()` or focus existing
- [ ] Create `src/features/schedules/sw-registration.ts`:
  - Register notification SW on app load
  - Request notification permission
  - Subscribe to push with VAPID public key
  - Send subscription to server
  - Handle permission denied gracefully
- [ ] Push permission prompt — inline banner on `/reminders` if notifications not granted
- [ ] **Verify**: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all pass
- [ ] **Verify**: Push subscription flow works in Chromium

#### Outputs

- `src/features/schedules/push.ts`, `scheduler.ts`, `sw-registration.ts`
- `public/notification-sw.js`
- Updated: `env.server.ts`, `env.client.ts`, `reminders.tsx`
- Dependency: `web-push`

---

### Decisions (Phase 9, all sub-phases)

- **Events are items** — `type: 'event'` in the unified items table. No separate entity. Tags, dates, and all item features come free
- **Schedules are orthogonal** — any item can have schedules. Event + schedule = standalone reminder. Task + schedule = "remind me about this task". Item + schedule + cloneOnFire = recurring task generation
- **`cloneOnFire` replaces "reminder type"** — instead of `event` vs `task` reminder types, it's a boolean on the schedule. Simpler, more flexible
- **RRULE standard** — iCal-compatible recurrence rules via `rrule` package. Future-proof, powerful, widely understood
- **`scheduleHistory` for audit trail** — every fire/snooze/dismiss logged. Enables "past" view without losing data as recurring schedules advance
- **Server-side scheduler + SW fallback** — server polls every 30s for reliability, SW handles background push delivery
- **Separate service worker** — `notification-sw.js` is distinct from MSW's `mockServiceWorker.js`
- **VAPID keys in env vars** — standard Web Push auth, generated once per deployment
- **Snooze presets only** — 5m, 15m, 1h, tomorrow 9am. No custom time picker
- **Reminder Dialog creates event + schedule** — one dialog, one operation. For adding a reminder to an existing task/note, the TaskDialog/NoteDialog inline a schedule picker
- **DB tables already exist** — `schedules`, `scheduleHistory`, `pushSubscriptions` were created in a prior migration. No schema changes needed for 9A–9F
- **Build vertical slices** — each sub-phase delivers a complete layer (data → UI → integration) that works independently. Push notifications (9F) are entirely optional — the app is fully functional after 9D

---

## Phase 10: Multi-User & Auth (Future)

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

**After Phase 8 migration (unified model):**

```
items ──── itemTags ──── tags
  │
  ├── itemMetadata (one-to-one, AI keywords + future embeddings)
  │
  ├── schedules (one-to-many, reminder timing + recurrence)
  │     └── scheduleHistory (audit: fired, snoozed, dismissed, task_created)
  │
  └── self-reference (parentItemId → items.id for subtasks)

pushSubscriptions (per user, for Web Push delivery)

Item types: 'task' | 'note' | 'event'
- task: completable, has subtasks, appears in day view + backlog
- note: content-first, AI-processed, appears in notes page + day view
- event: standalone reminder entry, appears in reminders page

All types share: title, content, date, tags, metadata, schedules
Behavior differs by type column + conditional UI
```

**Before Phase 8 (legacy, for reference):**

```
tasks ──── taskTags ──── tags ──── noteTags ──── notes
                                                   │
                                              noteMetadata
```

### Environment Variables

| Variable            | Scope  | Phase | Description                                                                          |
| ------------------- | ------ | ----- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`      | Server | 3     | PostgreSQL connection string (e.g., `postgres://whatidid:whatidid@db:5432/whatidid`) |
| `AI_PROVIDER`       | Server | 7     | `xai` (default), `openai`, `ollama`, `anthropic`                                     |
| `AI_API_KEY`        | Server | 7     | xAI API key for Grok (optional — AI degrades gracefully)                             |
| `VAPID_PUBLIC_KEY`  | Both   | 9     | Web Push VAPID public key (server signs, client subscribes)                          |
| `VAPID_PRIVATE_KEY` | Server | 9     | Web Push VAPID private key (server-only, never exposed to client)                    |
| `VAPID_SUBJECT`     | Server | 9     | VAPID subject — `mailto:` email or URL identifying the app                           |

### New npm Packages by Phase

| Phase | Packages                                                       |
| ----- | -------------------------------------------------------------- |
| 2     | `@playwright/test`                                             |
| 3     | `drizzle-orm`, `postgres`, `drizzle-kit`                       |
| 4     | None (CSS-only — uses existing Tailwind CSS 4 `@theme` system) |
| 5     | `sonner` (toast notifications)                                 |
| 7     | `openai`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` |
| 8     | None (schema migration + code refactor only)                   |
| 9B    | `rrule`                                                        |
| 9F    | `web-push`                                                     |
| 10    | TBD (auth library)                                             |
