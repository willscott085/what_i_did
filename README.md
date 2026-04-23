# whatIdid

A personal task tracker, notes system, and reminder app with AI-powered features. Built as a **Progressive Web App (PWA)** — installable on mobile and desktop with offline support and automatic updates.

## Tech Stack

- **Framework:** React 19 + TanStack Start (full-stack SSR)
- **Database:** PostgreSQL via Drizzle ORM
- **Styling:** Tailwind CSS 4 with OKLCH design tokens
- **PWA:** Hand-rolled service worker (`public/sw.js`) for push notifications and update prompts
- **Testing:** Vitest (unit), Playwright (E2E)

## Development

```sh
pnpm install
pnpm dev
```

The app runs at `http://localhost:55001` by default.

### Database

```sh
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed sample data
pnpm db:studio     # Open Drizzle Studio
```

### Testing

```sh
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright)
pnpm test:e2e:ui   # Playwright UI mode
```

### Build & Preview

```sh
pnpm build         # Production build (includes PWA service worker generation)
pnpm start         # Start production server
```

The app ships a hand-rolled service worker at `public/sw.js` (copied to the Nitro output directory during build). It handles `push`, `notificationclick`, and skip-waiting for reload prompts. It does not precache assets.

## PWA

The app is a fully installable Progressive Web App:

- **Installable** — "Add to Home Screen" on mobile, install button on desktop browsers
- **Auto-updates** — when a new version is deployed, users see a reload prompt
- **Standalone mode** — runs without browser chrome when installed (`display: standalone`)

### PWA Configuration

- **Service worker:** Hand-rolled `public/sw.js` — handles `push` / `notificationclick` events and SKIP_WAITING messages
- **Manifest:** `public/site.webmanifest`
- **Update strategy:** reload prompt when a new SW takes control (user chooses when to reload)
- **Icons:** 192x192 and 512x512 PNG icons in `public/`, plus maskable variant

### Testing the PWA locally

The service worker is **not registered in dev mode**. To test PWA behavior:

```sh
pnpm build && pnpm start
```

Then open in Chrome, check the Application tab in DevTools for the service worker and manifest.

## Environment Variables

Create a `.env.local` file in the project root:

| Variable            | Scope  | Required | Description                                          |
| ------------------- | ------ | -------- | ---------------------------------------------------- |
| `DATABASE_URL`      | Server | Yes      | PostgreSQL connection string                         |
| `AI_PROVIDER`       | Server | No       | `xai` (default), `openai`, `ollama`, `anthropic`     |
| `AI_API_KEY`        | Server | No       | API key for the AI provider (AI degrades gracefully) |
| `VAPID_PUBLIC_KEY`  | Both   | No       | Web Push VAPID public key (Phase 9)                  |
| `VAPID_PRIVATE_KEY` | Server | No       | Web Push VAPID private key (Phase 9)                 |
| `VAPID_SUBJECT`     | Server | No       | VAPID subject identifier (Phase 9)                   |

> Never commit secrets or API keys. Server-only vars are in `src/config/env.server.ts`, client vars in `src/config/env.client.ts`.

## Project Structure

```
src/
  features/{domain}/   # Feature modules (items, tasks, tags, notes, events, schedules, ai)
  components/          # Shared UI components
  components/ui/       # Primitive UI components (button, dialog, input, etc.)
  routes/              # File-based routes (TanStack Router)
  db/                  # Database schema, client, seed data
  config/              # Environment configuration
  styles/              # CSS and design tokens
  hooks/               # Custom React hooks
  tests/               # Test setup and mocks
  utils/               # Shared utilities
public/                # Static assets, icons, manifest
e2e/                   # Playwright E2E tests
```

See `.github/PLAN.md` for the full implementation plan and `.github/copilot-instructions.md` for coding conventions.
