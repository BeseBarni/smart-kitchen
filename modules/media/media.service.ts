import { err, ok, type AppError, type Result } from "@app/shared";
import type { MediaAssetRow } from "./media.repo";
import {
  findAsset,
  findOwnedUploadedAssets,
  insertPendingAsset,
  listExpiredPendingAssets,
  markAssetDeleted,
  markAssetUploaded,
} from "./media.repo";
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteObject,
  getObjectBuffer,
  headObject,
  readR2Config,
  type R2Config,
} from "./r2.client";
import type {
  MediaAssetDto,
  MediaPurpose,
  PresignUploadInput,
  PresignUploadResponse,
} from "./media.schema";

function purposeLimit(purpose: MediaPurpose): number {
  return purpose === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "avif";
}

function dto(asset: MediaAssetRow, config: R2Config): MediaAssetDto {
  return {
    id: asset.id,
    userId: asset.userId,
    purpose: asset.purpose,
    status: asset.status,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    url: resolveSyncUrl(asset, config),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function resolveSyncUrl(asset: MediaAssetRow, config: R2Config): string {
  if (
    config.publicUrl &&
    asset.purpose !== "chat_attachment" &&
    asset.purpose !== "avatar" &&
    asset.purpose !== "receipt_scan"
  ) {
    return `${config.publicUrl}/${asset.objectKey}`;
  }
  return `/api/media/${asset.id}/file`;
}

export async function requestUploadUrl(
  userId: string,
  input: PresignUploadInput,
): Promise<Result<PresignUploadResponse, AppError>> {
  if (input.sizeBytes > purposeLimit(input.purpose)) {
    return err({
      code: "VALIDATION_ERROR",
      message: `This upload exceeds the ${input.purpose} size limit.`,
    });
  }
  try {
    const config = readR2Config();
    const pendingId = crypto.randomUUID();
    const objectKey = `uploads/${userId}/${input.purpose}/${pendingId}.${extensionForMime(input.mimeType)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const asset = await insertPendingAsset({
      id: pendingId,
      userId,
      purpose: input.purpose,
      bucket: config.bucket,
      objectKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      expiresAt,
    });
    if (asset.id !== pendingId) {
      throw new Error("The generated media asset ID did not match the object key.");
    }
    const uploadUrl = await createPresignedPutUrl(config, {
      key: asset.objectKey,
      contentType: asset.mimeType,
      contentLength: asset.sizeBytes,
    });
    return ok({
      assetId: asset.id,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
      requiredHeaders: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(asset.sizeBytes),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload could not be prepared.";
    return err({ code: "INTERNAL_ERROR", message });
  }
}

export async function confirmUpload(
  userId: string,
  assetId: string,
): Promise<Result<MediaAssetDto, AppError>> {
  const asset = await findAsset(assetId);
  if (!asset || asset.userId !== userId) {
    return err({ code: "UNAUTHORIZED", message: "This media asset is not accessible." });
  }
  if (asset.status === "deleted") {
    return err({ code: "ITEM_NOT_FOUND", message: "This media asset was deleted." });
  }
  try {
    const config = readR2Config();
    const head = await headObject(config, asset.objectKey);
    if (head.contentLength !== asset.sizeBytes || head.contentType !== asset.mimeType) {
      return err({
        code: "VALIDATION_ERROR",
        message: "The uploaded file does not match the declared type or size.",
      });
    }
    const uploaded = await markAssetUploaded(asset.id, asset.mimeType, asset.sizeBytes);
    return ok(dto(uploaded, config));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload confirmation failed.";
    return err({ code: "INTERNAL_ERROR", message });
  }
}

export async function assertOwnedUploadedAssets(
  userId: string,
  assetIds: string[],
  expectedPurpose?: MediaPurpose,
): Promise<Result<MediaAssetRow[], AppError>> {
  if (assetIds.length === 0) return ok([]);
  const assets = await findOwnedUploadedAssets(userId, assetIds, expectedPurpose);
  if (assets.length !== assetIds.length) {
    return err({
      code: "UNAUTHORIZED",
      message: "One or more media assets are not uploaded and owned by this user.",
    });
  }
  return ok(assets);
}

export async function resolveReadableUrl(assetId: string, userId: string): Promise<Result<string, AppError>> {
  const asset = await findAsset(assetId);
  if (!asset || asset.userId !== userId || asset.status !== "uploaded") {
    return err({ code: "UNAUTHORIZED", message: "This media asset is not accessible." });
  }
  try {
    const config = readR2Config();
    if (
      config.publicUrl &&
      asset.purpose !== "chat_attachment" &&
      asset.purpose !== "avatar" &&
      asset.purpose !== "receipt_scan"
    ) {
      return ok(`${config.publicUrl}/${asset.objectKey}`);
    }
    return ok(await createPresignedGetUrl(config, asset.objectKey, 3600));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media URL could not be resolved.";
    return err({ code: "INTERNAL_ERROR", message });
  }
}

export async function getObjectBufferForAsset(
  userId: string,
  assetId: string,
): Promise<Result<{ bytes: Uint8Array; mimeType: string }, AppError>> {
  const asset = await findAsset(assetId);
  if (!asset || asset.userId !== userId || asset.status !== "uploaded") {
    return err({ code: "UNAUTHORIZED", message: "This media asset is not accessible." });
  }
  try {
    const result = await getObjectBuffer(readR2Config(), asset.objectKey);
    return ok({ bytes: result.bytes, mimeType: result.mimeType ?? asset.mimeType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media bytes could not be loaded.";
    return err({ code: "INTERNAL_ERROR", message });
  }
}

export async function softDeleteAndPurge(
  userId: string,
  assetId: string,
): Promise<Result<boolean, AppError>> {
  const asset = await findAsset(assetId);
  if (!asset || asset.userId !== userId) {
    return err({ code: "UNAUTHORIZED", message: "This media asset is not accessible." });
  }
  await markAssetDeleted(assetId);
  try {
    await deleteObject(readR2Config(), asset.objectKey);
  } catch (error) {
    console.error("Media object purge failed:", error);
  }
  return ok(true);
}

export async function cleanupExpiredPendingUploads(limit = 100): Promise<Result<number, AppError>> {
  try {
    const config = readR2Config();
    const assets = await listExpiredPendingAssets(limit);
    for (const asset of assets) {
      await markAssetDeleted(asset.id);
      await deleteObject(config, asset.objectKey).catch((error) => {
        console.error("Expired media object purge failed:", error);
      });
    }
    return ok(assets.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pending media cleanup failed.";
    return err({ code: "INTERNAL_ERROR", message });
  }
}
