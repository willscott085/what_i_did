# whatIdid — Master Implementation Plan

> **How to use this file**: This plan drives iterative development. Each phase is implemented one at a time, committed in small batches. AI assistants should read this file at the start of every session to understand current state. Update the status checkboxes and notes as work progresses.

## Key Decisions

| Decision        | Choice                                                     | Rationale                                                                                                 |
| --------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Backend         | TanStack Start server functions + Drizzle ORM + PostgreSQL | No separate API framework — server functions already exist, just swap data layer                          |
| ORM             | Drizzle                                                    | Lightweight, type-safe, SQL-like syntax                                                                   |
| Database        | PostgreSQL (via docker-compose)                            | Relational, full-text search built-in, dev container provides it                                          |
| AI Provider     | Provider-agnostic abstraction                              | Start with xAI/Grok, design to swap to OpenAI/Ollama/Anthropic. Uses `openai` SDK with custom base URL    |
| AI Notes        | Metadata table + PostgreSQL full-text search               | AI generates title (if none given) + keywords on save. `tsvector`/`tsquery` for search, no embeddings yet |
| Auth            | Deferred (Phase 8)                                         | userId column baked in from day one, hardcode '1' for now                                                 |
| Tags            | Flat tag system                                            | Tags are the sole organizational mechanism — flexible, orthogonal, many-to-many                           |
| Notes Format    | Tiptap rich text editor, stored as markdown                | Tiptap for editing, markdown for portable storage and full-text indexing                                  |
| Deployment      | Local only for now                                         | Docker Compose with PostgreSQL, simple local setup                                                        |
| Codebase        | Evolve existing — don't start fresh                        | Reuse TanStack Start, React Query, dnd-kit, Tailwind foundations                                          |
| Testing         | Vitest (unit/integration) + Playwright (E2E)               | Vitest already set up; Playwright pairs well with Vite stack, cross-browser, great TypeScript support     |
| Dev Environment | Dev container (Docker)                                     | Reproducible setup, Playwright browsers pre-installed, Codespaces-ready                                   |

### Simplification Decisions (Post-Phase 5)

- **Priority categories removed** — original plan had configurable priority categories (Business-Critical, Momentum Builders, etc.). Simplified to just tags for organization.
- **Recurrence removed** — `rrule` engine and `RecurrencePicker` were cut. Tasks use `startDate` only.
- **Lists removed** — `lists` and `listItems` tables were never implemented. Backlog + day view replaces static lists.
- **`dueDate` → `startDate`** — renamed to better reflect the concept: the day a task appears in your day view.

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

## Phase 8: Multi-User & Auth (Future)

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
tasks ──── taskTags ──── tags ──── noteTags ──── notes
                                                   │
                                              noteMetadata

tasks self-reference (parentTaskId → tasks.id) for subtasks
notes + tasks share the same tags pool via separate junction tables
noteMetadata is one-to-one with notes (AI-generated keywords, future embeddings)
```

### Environment Variables

| Variable       | Scope  | Phase | Description                                                                          |
| -------------- | ------ | ----- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Server | 3     | PostgreSQL connection string (e.g., `postgres://whatidid:whatidid@db:5432/whatidid`) |
| `AI_PROVIDER`  | Server | 7     | `xai` (default), `openai`, `ollama`, `anthropic`                                     |
| `AI_API_KEY`   | Server | 7     | xAI API key for Grok (optional — AI degrades gracefully)                             |

### New npm Packages by Phase

| Phase | Packages                                                       |
| ----- | -------------------------------------------------------------- |
| 2     | `@playwright/test`                                             |
| 3     | `drizzle-orm`, `postgres`, `drizzle-kit`                       |
| 4     | None (CSS-only — uses existing Tailwind CSS 4 `@theme` system) |
| 5     | `sonner` (toast notifications)                                 |
| 7     | `openai`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` |
| 8     | TBD (auth library)                                             |
