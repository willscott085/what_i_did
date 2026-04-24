/**
 * Production entry point.
 *
 * The Nitro server lazy-loads SSR modules, so the background scheduler
 * (which lives in the SSR bundle) won't start until the first HTTP request.
 * This wrapper starts the server and immediately fires a warmup request so
 * the scheduler boots within seconds of container start — not whenever the
 * first real user happens to visit.
 */

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
