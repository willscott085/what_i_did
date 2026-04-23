import { startScheduler } from "./scheduler";

// Use a globalThis marker so the guard survives if the module is loaded into
// two bundles (e.g. SSR entry + server-function chunk) inside the same Node
// process. A plain module-scoped `let` would reset in each copy.
const GLOBAL_KEY = "__whatidid_scheduler_booted__";

/**
 * Start the server-side scheduler. Idempotent across multiple module copies
 * in the same Node process. Invoked via a dynamic import from `server.ts`
 * (guarded by `import.meta.env.SSR`) so bundlers don't trace `scheduler.ts`
 * / `web-push` / `postgres` into the client bundle.
 */
export function bootScheduler(): void {
  const g = globalThis as unknown as Record<string, boolean | undefined>;
  if (g[GLOBAL_KEY]) return;
  g[GLOBAL_KEY] = true;
  startScheduler();
}
