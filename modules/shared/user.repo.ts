import { authUsers, getDatabase } from "@app/db";
import { eq } from "drizzle-orm";

export async function authUserExists(userId: string): Promise<boolean> {
  const [user] = await getDatabase()
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  return Boolean(user);
}
