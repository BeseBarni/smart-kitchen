import type { Recipe } from "../types";
import { RecipeCard } from "./RecipeCard";

interface RecipesListProps {
  recipes: Recipe[];
  total: number;
  pendingIds: string[];
  onFavorite: (recipe: Recipe) => void;
}

export function RecipesList({ recipes, total, pendingIds, onFavorite }: RecipesListProps): React.JSX.Element {
  if (!recipes.length) {
    return <p role="status" className="rounded-xl border bg-card p-5 text-body-md text-muted-foreground">
      {total === 0 ? "No recipes in this demo yet." : "No recipes match your search and filter."}
    </p>;
  }
  return (
    <section aria-label="Recipe results" className="space-y-4">
      {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} pending={pendingIds.includes(recipe.id)} onFavorite={onFavorite} />)}
    </section>
  );
}
