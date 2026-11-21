const labels: Record<string, string> = {
  delegate_to_recipe_architect: "Planning your recipe...",
  delegate_to_inventory_ops: "Checking your inventory...",
  delegate_to_kitchen_advisor: "Checking your kitchen information...",
  profile_get: "Checking your preferences...",
  profile_update_targets: "Preparing target changes...",
  inventory_list: "Checking your inventory...",
  inventory_get_summary: "Checking your inventory...",
  inventory_list_expiring: "Checking what needs using soon...",
  recipes_list: "Checking your saved recipes...",
  recipes_get_detail: "Checking your saved recipe...",
  ingredients_search: "Checking ingredients...",
  meal_logs_get_daily_summary: "Checking your meal history...",
  meal_prep_architect_skill: "Creating your meal prep recipe...",
  fridge_rescue_skill: "Finding ways to use your food...",
  nutrition_cost_estimator_skill: "Estimating nutrition and cost...",
  ui_present_recipe_draft: "Preparing your recipe...",
  ui_request_confirmation: "Preparing a confirmation...",
  recipes_create: "Saving your recipe...",
  recipes_cook_and_stock: "Updating your inventory...",
  ingredients_create: "Adding an ingredient...",
  inventory_add_item: "Updating your inventory...",
  inventory_adjust_quantity: "Updating your inventory...",
  inventory_consume_portion: "Updating your inventory...",
  inventory_discard_item: "Updating your inventory...",
};

export function toolStatusLabel(toolName: string): string {
  return labels[toolName] ?? "Working on your request...";
}
