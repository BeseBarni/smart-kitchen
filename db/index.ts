import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;
let client: ReturnType<typeof postgres> | undefined;

export function getDatabase(): Database {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required.");
    client = postgres(url, { max: 1, idle_timeout: 20, prepare: false });
    database = drizzle(client, { schema });
  }
  return database;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const target = getDatabase();
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.end();
    client = undefined;
    database = undefined;
  }
}

export * from "./schema";
