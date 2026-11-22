import { z } from "zod";

export const mediaPurposeSchema = z.enum([
  "chat_attachment",
  "recipe_cover",
  "ingredient_photo",
  "avatar",
  "inventory_photo",
  "receipt_scan",
]).describe("Purpose of an uploaded media asset.");

export const mediaStatusSchema = z.enum([
  "pending",
  "uploaded",
  "deleted",
]).describe("Lifecycle status of a media asset.");

export const presignUploadInputSchema = z.object({
  purpose: mediaPurposeSchema,
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  width: z.number().int().positive().max(1600).optional(),
  height: z.number().int().positive().max(1600).optional(),
}).strict();

export const presignUploadResponseSchema = z.object({
  assetId: z.string().uuid(),
  uploadUrl: z.string().url(),
  expiresAt: z.iso.datetime(),
  requiredHeaders: z.object({
    "Content-Type": z.string(),
    "Content-Length": z.string(),
    "Cache-Control": z.string(),
  }).strict(),
}).strict();

export const confirmUploadInputSchema = z.object({
  assetId: z.string().uuid(),
}).strict();

export const mediaAssetDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  purpose: mediaPurposeSchema,
  status: mediaStatusSchema,
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  url: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;
export type PresignUploadInput = z.infer<typeof presignUploadInputSchema>;
export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;
export type MediaAssetDto = z.infer<typeof mediaAssetDtoSchema>;
