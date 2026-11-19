import { getDatabase } from "@app/db";
import { sql } from "drizzle-orm";

export type Account = {
  id: string;
  name: string;
  email: string;
};

export async function findAccount(id: string): Promise<Account | undefined> {
  const rows = await getDatabase().execute<Account>(
    sql`select id, name, email from neon_auth."user" where id = ${id} limit 1`,
  );
  return rows[0];
}
