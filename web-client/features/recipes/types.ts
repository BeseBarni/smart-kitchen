// Provisional UI contracts until shared recipe DTOs and endpoints exist.
export type RecipeFilter = "all" | "meal-prep" | "ai-generated" | "quick" | "freezer-friendly";
export type RecipeTag = "meal-prep" | "ai-generated" | "freezer-friendly";

export interface Recipe {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
  highlight: string;
  stockLabel: string;
  prepMinutes: number;
  portions: number;
  storageLabel: string;
  calories: number;
  ingredients: string[];
  tags: RecipeTag[];
  favorite: boolean;
}

export interface FavoriteUpdate {
  id: string;
  favorite: boolean;
}
