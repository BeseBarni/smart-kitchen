export type InventoryActionSummary = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: "fridge" | "freezer" | "pantry";
};

export type RecipeCardPayload = {
  id?: string;
  title: string;
  description: string;
  servings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions: string[];
  caloriesPerServing?: number | null;
  proteinPerServing?: number | null;
  carbsPerServing?: number | null;
  fatPerServing?: number | null;
  costPerServing?: number | null;
  currency?: string;
};

export type ExpiringItemSummary = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
};

export type RescueOptionSummary = {
  title: string;
  usesExpiringItems: string[];
  prepTimeMin: number;
};

export type MealLogSummary = {
  name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  costAmount: number | null;
  currency: string;
};

export type DailyMacroSummary = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type UiDirective =
  | {
      component: "inventory_action_card";
      action: "added" | "updated" | "consumed" | "discarded";
      items: InventoryActionSummary[];
    }
  | {
      component: "recipe_preview_card";
      status: "draft" | "saved";
      recipe: RecipeCardPayload;
      canSave: boolean;
      canCookAndStock: boolean;
    }
  | {
      component: "expiring_rescue_card";
      expiringItems: ExpiringItemSummary[];
      rescueOptions: RescueOptionSummary[];
    }
  | {
      component: "consumption_summary_card";
      loggedMeal: MealLogSummary;
      dailyTotals?: DailyMacroSummary;
    }
  | {
      component: "confirmation_prompt";
      actionId: string;
      title: string;
      description: string;
      confirmLabel: string;
      payload: Record<string, unknown>;
    };
