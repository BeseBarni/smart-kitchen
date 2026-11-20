import type { Recipe } from "../types";
import { RecipeCard } from "./RecipeCard";

interface RecipesListProps {
  recipes: Recipe[];
  total: number;
  pending: boolean;
  onView: (id: string) => void;
  onCook: (id: string) => void;
}

export function RecipesList({ recipes, total, pending, onView, onCook }: RecipesListProps): React.JSX.Element {
  if (!recipes.length) {
    return <p role="status" className="rounded-xl border bg-card p-5 text-body-md text-muted-foreground">
      {total === 0 ? "No recipes yet. Add one to start your library." : "No recipes match your search and filter."}
    </p>;
  }
  return (
    <section aria-label="Recipe results" className="space-y-4">
      {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} pending={pending} onView={onView} onCook={onCook} />)}
    </section>
  );
}
