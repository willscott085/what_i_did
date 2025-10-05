import { z } from "zod";

const serverSchema = z.object({
  API_URL: z.string().url("API_URL must be a valid URL"),
  NODE_ENV: z.enum(["development", "production", "test"]),
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
