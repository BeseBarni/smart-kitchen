import type { NutritionTargetChanges } from "@app/modules/schemas";

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
  imageUrl?: string | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  isFreezerFriendly?: boolean;
  servings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string | null }>;
  instructions: string[];
  caloriesPerServing?: number | null;
  proteinPerServing?: number | null;
  carbsPerServing?: number | null;
  fatPerServing?: number | null;
  fiberPerServing?: number | null;
  costPerServing?: number | null;
  currency?: string;
  tags?: Array<{ slug?: string; label: string; category?: "dietary" | "nutrition" | "prep" | "flavor" | "custom" }>;
  shelfLifeDays?: { fridge?: number | null; freezer?: number | null; pantry?: number | null };
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
  fiberG?: number | null;
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
  | { component: "profile_targets_updated" }
  | { component: "profile_targets_confirmation"; targets: NutritionTargetChanges }
  | {
      component: "recommendation_chips";
      recommendations: string[];
    }
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
    }
  | {
      component: "receipt_import_card";
      merchant: string | null;
      purchasedAt: string | null;
      currency: string;
      totalAmount: number | null;
      items: Array<{
        tempId: string;
        name: string;
        quantity: number;
        unit: string;
        priceAmount: number | null;
        storageLocation: "fridge" | "freezer" | "pantry";
        estimatedShelfLifeDays: number | null;
        expiresAt?: string | null;
        shelfLifeDays?: { fridge?: number | null; freezer?: number | null; pantry?: number | null };
        estimatedMacrosPerUnit?: {
          calories: number | null;
          proteinG: number | null;
          carbsG: number | null;
          fatG: number | null;
          fiberG: number | null;
        } | null;
        isFoodItem: boolean;
        confidence: "high" | "medium" | "low";
      }>;
    };
