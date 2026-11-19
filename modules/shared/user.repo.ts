import { authUsers, getDatabase } from "@app/db";

export async function ensureAuthUser(userId: string): Promise<void> {
  await getDatabase().insert(authUsers).values({ id: userId }).onConflictDoNothing();
}
