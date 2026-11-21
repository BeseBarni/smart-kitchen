import { err, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { findProfile, insertDefaultProfile, updateAuthUserImage, updateProfileRow } from "./profile.repo";
import type { ProfileDto, UpdateProfileInput } from "./profile.schema";
import { assertOwnedUploadedAssets, softDeleteAndPurge } from "../media/media.service";

function toProfileDto(row: NonNullable<Awaited<ReturnType<typeof findProfile>>>): ProfileDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    avatarAssetId: row.avatarAssetId,
    avatarUrl: row.avatarAssetId ? `/api/media/${row.avatarAssetId}/file` : null,
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
  const existing = await findProfile(userId);
  if (input.avatarAssetId) {
    const media = await assertOwnedUploadedAssets(userId, [input.avatarAssetId], "avatar");
    if (!media.success) return err(media.error);
  }
  const oldAssetId = existing?.avatarAssetId ?? null;
  const avatarUrl = input.avatarAssetId
    ? `/api/media/${input.avatarAssetId}/file`
    : input.avatarAssetId === null
      ? null
      : undefined;
  const updated = await updateProfileRow(userId, {
    ...input,
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
  });
  if (updated && input.avatarAssetId !== undefined) {
    await updateAuthUserImage(userId, avatarUrl ?? null);
  }
  if (oldAssetId && input.avatarAssetId !== undefined && input.avatarAssetId !== oldAssetId) {
    await softDeleteAndPurge(userId, oldAssetId);
  }
  return updated
    ? ok(toProfileDto(updated))
    : err({ code: "INTERNAL_ERROR", message: "Profile could not be updated." });
}
