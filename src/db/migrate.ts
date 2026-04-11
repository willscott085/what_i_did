import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const sqlite = new Database("./data/whatidid.db");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: "./drizzle" });

console.info("Migrations applied successfully.");
sqlite.close();
