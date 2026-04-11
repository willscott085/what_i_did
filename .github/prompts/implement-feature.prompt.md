---
description: 'Implement a phase from the master plan'
mode: 'agent'
---

# Implement Plan Phase

Before starting, read `.github/PLAN.md` to understand the full plan and current progress.

## Your task

Implement the next incomplete phase (or a specific phase if I name one). Follow these rules:

1. **Read the plan first** — check which phase items are incomplete
2. **Work through each checklist item** in order
3. **Commit in small batches** — group related changes (e.g., schema + migration, then server functions, then UI)
4. **Mark items complete** in `PLAN.md` as you finish them (`- [x]`)
5. **Verify at the end** — run tests, check the app works
6. **Do not skip ahead** to future phases

## Conventions

Follow all patterns in `.github/copilot-instructions.md`. Key reminders:
- Server functions use `createServerFn` + Zod validation + Drizzle queries
- React Query options wrap server functions in `queries.ts`
- Mutations use optimistic updates in `mutations.ts`
- Feature modules go in `src/features/{domain}/`
- Components go in `src/components/`
