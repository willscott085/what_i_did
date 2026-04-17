import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);
await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();

console.info("Migrations applied successfully.");
