import { z } from "zod";

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

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }

  return Object.freeze(parsed.data);
})();
