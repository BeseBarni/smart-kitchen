import { db } from "@app/db";
import { mediaAssets } from "@app/db";
import { and, eq, lte, or } from "drizzle-orm";
import type { MediaPurpose } from "./media.schema";

export type MediaAssetRow = typeof mediaAssets.$inferSelect;

export async function insertPendingAsset(input: {
  id: string;
  userId: string;
  purpose: MediaPurpose;
  bucket: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  expiresAt: Date;
}): Promise<MediaAssetRow> {
  const [row] = await db.insert(mediaAssets).values({
    id: input.id,
    userId: input.userId,
    purpose: input.purpose,
    bucket: input.bucket,
    objectKey: input.objectKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    width: input.width,
    height: input.height,
    expiresAt: input.expiresAt,
  }).returning();
  if (!row) throw new Error("Media asset insert returned no row.");
  return row;
}

export async function findAsset(assetId: string): Promise<MediaAssetRow | undefined> {
  return db.query.mediaAssets.findFirst({ where: (assets, { eq: equal }) => equal(assets.id, assetId) });
}

export async function markAssetUploaded(assetId: string, mimeType: string, sizeBytes: number): Promise<MediaAssetRow> {
  const [row] = await db.update(mediaAssets).set({
    status: "uploaded",
    mimeType,
    sizeBytes,
    expiresAt: null,
    updatedAt: new Date(),
  }).where(eq(mediaAssets.id, assetId)).returning();
  if (!row) throw new Error("Media asset update returned no row.");
  return row;
}

export async function findOwnedUploadedAssets(
  userId: string,
  assetIds: string[],
  purpose?: MediaPurpose,
): Promise<MediaAssetRow[]> {
  if (assetIds.length === 0) return [];
  return db.select().from(mediaAssets).where(and(
    eq(mediaAssets.userId, userId),
    eq(mediaAssets.status, "uploaded"),
    purpose ? eq(mediaAssets.purpose, purpose) : undefined,
    or(...assetIds.map((assetId) => eq(mediaAssets.id, assetId))),
  ));
}

export async function markAssetDeleted(assetId: string): Promise<MediaAssetRow | undefined> {
  const [row] = await db.update(mediaAssets).set({
    status: "deleted",
    updatedAt: new Date(),
  }).where(eq(mediaAssets.id, assetId)).returning();
  return row;
}

export async function listExpiredPendingAssets(limit = 100): Promise<MediaAssetRow[]> {
  return db.select().from(mediaAssets).where(and(
    eq(mediaAssets.status, "pending"),
    lte(mediaAssets.expiresAt, new Date()),
  )).limit(limit);
}
