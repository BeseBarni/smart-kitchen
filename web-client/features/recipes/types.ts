import type { ListRecipesQuery, RecipeDto } from "@app/modules/schemas";

export type Recipe = RecipeDto;
export type RecipeFilter = "all" | "ai-generated" | "quick" | "freezer-friendly";
export type RecipeListFilters = Omit<Partial<ListRecipesQuery>, "isFreezerFriendly"> & {
  isFreezerFriendly?: "true" | "false";
};
