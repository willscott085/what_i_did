import { readFileSync } from "node:fs";
import { z } from "zod";

/**
 * Read a Docker secret from /run/secrets/<name>.
 * Returns undefined if the file doesn't exist (not running in Swarm/Compose
 * secrets mode, or the secret wasn't mounted).
 */
function readSecret(name: string): string | undefined {
  try {
    return readFileSync(`/run/secrets/${name}`, "utf-8").trim();
  } catch {
    return undefined;
  }
}

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("production"),
  AI_PROVIDER: z.enum(["xai"]).optional().default("xai"),
  AI_API_KEY: z.string().min(1).optional(),
  // Web Push (VAPID) — all optional; push notifications stay disabled if unset
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(),
});

export const serverEnv = (() => {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv imported in a client bundle");
  }

  // Docker secrets: file at /run/secrets/<name> takes precedence over env var
  const secretOverrides: Record<string, string | undefined> = {
    VAPID_PRIVATE_KEY: readSecret("vapid_private_key"),
    AI_API_KEY: readSecret("ai_api_key"),
  };

  const env = { ...process.env };
  for (const [key, value] of Object.entries(secretOverrides)) {
    if (value) env[key] = value;
  }

  const parsed = serverSchema.safeParse(env);

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }

  return Object.freeze(parsed.data);
})();
