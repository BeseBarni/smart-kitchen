import type { Recipe } from "../types";
import { RecipeCard } from "./RecipeCard";
import { useText } from "@/lib/i18n";

interface RecipesListProps {
  recipes: Recipe[];
  total: number;
  pending: boolean;
  onView: (id: string) => void;
  onCook: (id: string) => void;
}

export function RecipesList({ recipes, total, pending, onView, onCook }: RecipesListProps): React.JSX.Element {
  const { t } = useText();
  if (!recipes.length) {
    return <p role="status" className="rounded-xl border bg-card p-5 text-body-md text-muted-foreground">
      {t(total === 0 ? "recipes.empty" : "recipes.noMatches")}
    </p>;
  }
  return (
    <section aria-label={t("recipes.results")} className="space-y-4">
      {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} pending={pending} onView={onView} onCook={onCook} />)}
    </section>
  );
}
