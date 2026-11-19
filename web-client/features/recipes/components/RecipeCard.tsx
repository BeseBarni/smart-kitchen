import { Bookmark, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "../types";
import { RecipeCardImage } from "./RecipeCardImage";
import { RecipeIngredients } from "./RecipeIngredients";
import { RecipeMetrics } from "./RecipeMetrics";

interface RecipeCardProps {
  recipe: Recipe;
  pending: boolean;
  onFavorite: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, pending, onFavorite }: RecipeCardProps): React.JSX.Element {
  return (
    <article className="overflow-hidden rounded-stitch-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <RecipeCardImage recipe={recipe} />
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="pt-2 text-headline-md">{recipe.title}</h2>
          <button type="button" aria-label={`Favorite ${recipe.title}`} aria-pressed={recipe.favorite}
            disabled={pending} onClick={() => onFavorite(recipe)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
            <Bookmark size={20} aria-hidden="true" className={recipe.favorite ? "fill-primary text-primary" : ""} />
          </button>
        </div>
        <RecipeMetrics recipe={recipe} />
        <RecipeIngredients ingredients={recipe.ingredients} />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" disabled title="Recipe details are unavailable in this demo"
            aria-label={`View details for ${recipe.title} unavailable in this demo`} className="min-h-11 min-w-0 flex-1">View Details</Button>
          <Button type="button" disabled title="Cook and Stock is unavailable in this demo"
            aria-label={`Cook and stock ${recipe.title} unavailable in this demo`} className="min-h-11 min-w-0 flex-1"><Zap aria-hidden="true" />Cook &amp; Stock</Button>
        </div>
      </div>
    </article>
  );
}
