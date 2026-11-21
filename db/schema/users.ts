import { pgSchema, pgTable, text, integer, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { unitSystemEnum } from "./enums";
import { mediaAssets } from "./media";

const neonAuth = pgSchema("neon_auth");

export interface DietaryPreferences {
  allergies: string[];
  dislikes: string[];
  goals?: string;
  notes?: string;
}

export const authUsers = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  image: text("image"),
});

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  dailyCalorieTarget: integer("daily_calorie_target"),
  dailyProteinG: integer("daily_protein_g"),
  dailyCarbsG: integer("daily_carbs_g"),
  dailyFatG: integer("daily_fat_g"),
  dailyFiberG: integer("daily_fiber_g"),
  dietaryPreferences: jsonb("dietary_preferences").$type<DietaryPreferences>(),
  currency: text("currency").default("HUF").notNull(),
  unitSystem: unitSystemEnum("unit_system").default("metric").notNull(),
  avatarAssetId: uuid("avatar_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
