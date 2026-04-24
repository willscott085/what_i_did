import { z } from "zod";

const clientSchema = z.object({
  VITE_APP_NAME: z.string().min(1, "VITE_APP_NAME is required"),
  // VAPID public key for Web Push — optional; push stays off if unset or empty
  VITE_VAPID_PUBLIC_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const clientEnv = (() => {
  const parsed = clientSchema.safeParse(import.meta.env);

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }

  return Object.freeze(parsed.data);
})();
