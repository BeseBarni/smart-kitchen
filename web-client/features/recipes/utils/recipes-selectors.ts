import type { Recipe, RecipeFilter } from "../types";

export function filterRecipes(recipes: readonly Recipe[], filter: RecipeFilter, search: string): Recipe[] {
  const needle = search.trim().toLocaleLowerCase();
  return recipes.filter((recipe) => {
    const matchesFilter = filter === "all" ||
      (filter === "quick" ? recipe.prepMinutes < 30 : recipe.tags.includes(filter));
    const text = [recipe.title, ...recipe.ingredients, ...recipe.tags.map((tag) => tag.replaceAll("-", " "))];
    return matchesFilter && text.some((value) => value.toLocaleLowerCase().includes(needle));
  });
}

export function recipeCounts(recipes: readonly Recipe[]): { total: number; favorites: number } {
  return { total: recipes.length, favorites: recipes.filter((recipe) => recipe.favorite).length };
}
