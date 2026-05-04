/**
 * Production entry point.
 *
 * Responsibilities, in order:
 *   1. Apply any pending Drizzle migrations against DATABASE_URL (idempotent —
 *      drizzle tracks applied migrations in `__drizzle_migrations`). This used
 *      to be a separate one-off container; running it inline guarantees the
 *      schema is current before the server accepts traffic and avoids silent
 *      failures when an operator forgets the manual step.
 *   2. Boot the Nitro SSR server.
 *   3. Warm up `/reminders` so the lazy-loaded background scheduler starts
 *      within seconds of container start, not whenever the first user visits.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[boot] DATABASE_URL is required to run migrations");
  }
  const client = postgres(url, { max: 1 });
  try {
    const start = Date.now();
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.info(`[boot] Migrations applied in ${Date.now() - start}ms`);
  } finally {
    await client.end();
  }
}

await runMigrations();

await import("./.output/server/index.mjs");

const port = process.env.PORT || 3000;
const MAX_RETRIES = 5;

async function warmup(attempt = 1) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/reminders`);
    console.info(
      `[boot] Warmup OK (${res.status}) — scheduler should be running`,
    );
  } catch {
    if (attempt < MAX_RETRIES) {
      console.warn(`[boot] Warmup attempt ${attempt} failed, retrying...`);
      setTimeout(() => warmup(attempt + 1), 1000 * attempt);
    } else {
      console.error(
        "[boot] Warmup failed after retries — scheduler will start on first real request",
      );
    }
  }
}

setTimeout(warmup, 1500);
