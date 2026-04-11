---
description: 'Review and verify a completed plan phase'
mode: 'agent'
---

# Review Completed Phase

Verify that a plan phase has been correctly implemented.

## Steps

1. **Read `.github/PLAN.md`** — identify which phase to review
2. **Check every checklist item** — verify the code exists and follows conventions
3. **Run tests**: `pnpm test`
4. **Check for type errors**: `tsc --noEmit`
5. **Check for lint errors**: `pnpm lint` (if available)
6. **Manual verification** — start the dev server and test key flows
7. **Report findings** — list any issues, missing items, or convention violations

## What to check

- [ ] All checklist items in the phase are marked complete
- [ ] Server functions validate input with Zod
- [ ] Database queries use Drizzle, not raw SQL or HTTP calls
- [ ] React Query options exist for all server functions
- [ ] Mutations use optimistic updates where appropriate
- [ ] Components use Tailwind (no inline styles)
- [ ] No `any` types
- [ ] No secrets or API keys committed
- [ ] Tests pass
- [ ] Types compile cleanly
