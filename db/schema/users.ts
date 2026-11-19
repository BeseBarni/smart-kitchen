import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { unitSystemEnum } from "./enums";

export interface DietaryPreferences {
  allergies: string[];
  dislikes: string[];
  goals?: string;
  notes?: string;
}

export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  dailyCalorieTarget: integer("daily_calorie_target"),
  dailyProteinG: integer("daily_protein_g"),
  dailyCarbsG: integer("daily_carbs_g"),
  dailyFatG: integer("daily_fat_g"),
  dietaryPreferences: jsonb("dietary_preferences").$type<DietaryPreferences>(),
  currency: text("currency").default("HUF").notNull(),
  unitSystem: unitSystemEnum("unit_system").default("metric").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
