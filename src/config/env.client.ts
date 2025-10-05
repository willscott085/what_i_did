import { z } from "zod";

const clientSchema = z.object({
  VITE_APP_NAME: z.string().min(1, "VITE_APP_NAME is required"),
});

export const clientEnv = (() => {
  const parsed = clientSchema.safeParse(import.meta.env);

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }

  return Object.freeze(parsed.data);
})();
