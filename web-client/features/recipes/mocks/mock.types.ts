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
