import { pgEnum } from "drizzle-orm/pg-core";

export const unitSystemEnum = pgEnum("unit_system", ["metric", "imperial"]);
export const baseUnitEnum = pgEnum("base_unit", ["g", "ml", "pcs"]);
export const recipeSourceEnum = pgEnum("recipe_source", ["manual", "ai_skill"]);
export const inventoryItemTypeEnum = pgEnum("inventory_item_type", [
  "meal_prep",
  "ingredient",
  "packaged",
]);
export const storageLocationEnum = pgEnum("storage_location", [
  "fridge",
  "freezer",
  "pantry",
]);
export const inventoryStatusEnum = pgEnum("inventory_status", [
  "in_stock",
  "consumed",
  "discarded",
]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
export const stockImageKindEnum = pgEnum("stock_image_kind", [
  "themealdb_meal",
  "themealdb_ingredient",
]);
export const conversationItemTypeEnum = pgEnum("conversation_item_type", [
  "message",
  "tool_call",
  "tool_result",
  "skill_execution",
]);
export const conversationRoleEnum = pgEnum("conversation_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);
