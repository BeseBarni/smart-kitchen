import { err, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { findProfile, insertDefaultProfile, updateProfileRow } from "./profile.repo";
import type { ProfileDto, UpdateProfileInput } from "./profile.schema";

function toProfileDto(row: NonNullable<Awaited<ReturnType<typeof findProfile>>>): ProfileDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateProfile(userId: string): Promise<Result<ProfileDto, AppError>> {
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  const existing = await findProfile(userId);
  if (existing) return ok(toProfileDto(existing));
  const created = await insertDefaultProfile(userId);
  if (created) return ok(toProfileDto(created));
  const raced = await findProfile(userId);
  return raced
    ? ok(toProfileDto(raced))
    : err({ code: "INTERNAL_ERROR", message: "Profile could not be created." });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<Result<ProfileDto, AppError>> {
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  await insertDefaultProfile(userId);
  const updated = await updateProfileRow(userId, input);
  return updated
    ? ok(toProfileDto(updated))
    : err({ code: "INTERNAL_ERROR", message: "Profile could not be updated." });
}
