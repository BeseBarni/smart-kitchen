import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let database: PostgresJsDatabase | undefined;

export function getDatabase(): PostgresJsDatabase {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required.");
    database = drizzle(postgres(url, { max: 1, idle_timeout: 20, prepare: false }));
  }
  return database;
}

export * from "./schema";
