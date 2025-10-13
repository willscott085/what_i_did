# Copilot Instructions for what_i_did

## Context

This application is a task and project management tool built with React and TypeScript and Tanstack Start. The tehch stack includes:

- React with functional components and hooks
- TypeScript (strict mode)
- Tailwind CSS for styling
- React Query for data fetching and caching and Tanstack Start loaders
- Vitest and React Testing Library for unit tests
- React Aria Components for accessible UI components

## General Principles

- Write idiomatic, modern TypeScript and React.
- Use the TanStack ecosystem where appropriate (Start, React Query, React Router, etc.).
- Prioritize readability, maintainability, and consistency.
- Follow the project's established folder structure and naming conventions.
- Prefer composition over inheritance.
- Document non-obvious code with concise comments.

## File & Folder Organization

- Place new features in `src/features/` using a flat structure.
- Shared UI components go in `src/components/`.
- Utilities and helpers belong in `src/utils/` or `src/hooks/`.
- Use `public/` for static assets.

## Code Style

- Use 2 spaces for indentation.
- Use single quotes for strings.
- Omit semicolons.
- Prefer `const` and `let` over `var`.
- Use arrow functions where possible.
- Use named exports; avoid default exports unless necessary.
- Use PascalCase for components and enums, camelCase for variables and functions.

## Styling

- Use Tailwind CSS for all styling.
- Use utility classes and `tailwind-variants` for component variants.
- Use the `cn` or `twMerge` helpers for class composition.
- Do not use inline styles unless absolutely necessary.

## Testing

- Write unit tests with Vitest and React Testing Library.
- Place tests next to the code under test or in `src/tests/`.
- For E2E, use Playwright (see `playwright/README.md`).
- Do not use `.only` in tests; the linter will fail the build.
- Mock network requests with MSW where possible.

## Environment & Configuration

- Use `.env.local` for local environment variables.
- Never commit secrets or credentials.
- Document any new environment variables in the README.

## Documentation

- Update `README.md` and relevant docs for new features or changes.
- Use JSDoc for complex functions or utilities.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Framework:** React (functional components, hooks), TanStack Start
- **Styling:** Tailwind CSS, tailwind-variants
- **State Management:** React Context, React Query (where needed)
- **Testing:** Vitest, React Testing Library, MSW (mocking)
- **Linting/Formatting:** ESLint, Prettier
- **Build Tooling:** Vite
- **API:** REST (fetch/axios)
