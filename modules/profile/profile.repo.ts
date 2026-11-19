import { eq } from "drizzle-orm";
import { getDatabase, userProfiles } from "@app/db";
import type { UpdateProfileInput } from "./profile.schema";

export async function findProfile(userId: string) {
  const [profile] = await getDatabase()
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return profile;
}

export async function insertDefaultProfile(userId: string) {
  const [profile] = await getDatabase()
    .insert(userProfiles)
    .values({ userId, currency: "HUF", unitSystem: "metric" })
    .onConflictDoNothing({ target: userProfiles.userId })
    .returning();
  return profile;
}

export async function updateProfileRow(userId: string, input: UpdateProfileInput) {
  const [profile] = await getDatabase()
    .update(userProfiles)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId))
    .returning();
  return profile;
}
