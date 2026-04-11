---
applyTo: '**/*.test.*'
---

# Testing Instructions

## Framework

- Vitest as test runner, React Testing Library for component tests
- MSW (Mock Service Worker) for mocking network requests

## Conventions

- Place test files next to the code under test, or in `src/tests/`
- Name test files `{name}.test.ts` or `{name}.test.tsx`
- Never use `.only` — the linter will fail the build
- Use `describe` blocks to group related tests
- Use clear test names: `it('should create a task with valid input')`

## Testing Server Functions

- Mock the Drizzle client — don't hit the real database
- Test input validation: verify Zod rejects invalid input
- Test handler logic: verify correct Drizzle calls are made

## Testing Components

- Render with `render()` from React Testing Library
- Query elements by role, label, or text — avoid `data-testid` unless necessary
- Use `userEvent` for interactions (click, type, etc.)
- Wrap async operations in `waitFor()`
- For components that use React Query, wrap in `QueryClientProvider` (see `src/tests/TestUtils.tsx`)

## Testing Mutations

- Verify optimistic updates update the cache correctly
- Verify rollback on error
- Mock server functions, don't test the network layer

## E2E Testing (Playwright)

- Playwright for end-to-end tests across Chromium, Firefox, and WebKit
- E2E tests live in `e2e/` at the project root — not in `src/tests/`
- Name test files `{feature}.spec.ts`
- Use `test` and `expect` from `@playwright/test`
- Use page object pattern for complex flows
- Prefer `getByRole`, `getByLabel`, `getByText` locators — avoid CSS selectors
- Run with `pnpm test:e2e` or `pnpm test:e2e:ui` for the interactive UI
- Dev server starts automatically via `webServer` config in `playwright.config.ts`
- Keep E2E tests focused on critical user flows — don't duplicate unit test coverage

## Setup

- Global setup in `src/tests/setup.ts`
- Test utilities in `src/tests/TestUtils.tsx`
- MSW handlers in `src/tests/mock/handlers.ts`
- Playwright config in `playwright.config.ts`
- Dev container (`.devcontainer/`) has Playwright browsers pre-installed
