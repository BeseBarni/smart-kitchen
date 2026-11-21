import { resolveText } from "../../../lib/i18n/orchestrator";
import type { SupportedLocale, TranslationKey } from "../../../lib/i18n/types";

const labels: Record<string, TranslationKey> = {
  delegate_to_recipe_architect: "chat.planningRecipe",
  delegate_to_inventory_ops: "chat.checkingInventory",
  delegate_to_kitchen_advisor: "chat.checkingKitchen",
  profile_get: "chat.checkingPreferences",
  profile_update_targets: "chat.preparingTargets",
  inventory_list: "chat.checkingInventory",
  inventory_get_summary: "chat.checkingInventory",
  inventory_list_expiring: "chat.checkingExpiring",
  recipes_list: "chat.checkingRecipes",
  recipes_get_detail: "chat.checkingRecipe",
  ingredients_search: "chat.checkingIngredients",
  meal_logs_get_daily_summary: "chat.checkingHistory",
  meal_prep_architect_skill: "chat.creatingRecipe",
  fridge_rescue_skill: "chat.findingFood",
  nutrition_cost_estimator_skill: "chat.estimating",
  ui_present_recipe_draft: "chat.preparingRecipe",
  ui_request_confirmation: "chat.preparingConfirmation",
  recipes_create: "chat.savingRecipe",
  recipes_cook_and_stock: "chat.updatingInventory",
  ingredients_create: "chat.addingIngredient",
  inventory_add_item: "chat.updatingInventory",
  inventory_adjust_quantity: "chat.updatingInventory",
  inventory_consume_portion: "chat.updatingInventory",
  inventory_discard_item: "chat.updatingInventory",
};

export function toolStatusLabel(toolName: string, locale: SupportedLocale = "en"): string {
  return resolveText(locale, labels[toolName] ?? "chat.working");
}
