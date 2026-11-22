import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const mediaPurposeEnum = pgEnum("media_purpose", [
  "chat_attachment",
  "recipe_cover",
  "ingredient_photo",
  "avatar",
  "inventory_photo",
  "receipt_scan",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "pending",
  "uploaded",
  "deleted",
]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    purpose: mediaPurposeEnum("purpose").notNull(),
    status: mediaStatusEnum("status").default("pending").notNull(),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("media_assets_user_purpose_status_idx").on(table.userId, table.purpose, table.status),
    index("media_assets_status_expires_at_idx").on(table.status, table.expiresAt),
  ],
);
