import type { Recipe, RecipeFilter } from "../types";

export function filterRecipes(recipes: readonly Recipe[], filter: RecipeFilter, search: string): Recipe[] {
  const needle = search.trim().toLocaleLowerCase();
  return recipes.filter((recipe) => {
    const matchesFilter = filter === "all" ||
      (filter === "quick" ? recipe.prepTimeMin !== null && recipe.prepTimeMin < 30 :
        filter === "ai-generated" ? recipe.source === "ai_skill" : recipe.isFreezerFriendly);
    const text = [recipe.title, recipe.description ?? "", ...recipe.ingredients.map(({ displayName }) => displayName)];
    return matchesFilter && text.some((value) => value.toLocaleLowerCase().includes(needle));
  });
}

export function recipeCounts(recipes: readonly Recipe[]): { total: number } {
  return { total: recipes.length };
}
