import { Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "../types";
import { RecipeIngredients } from "./RecipeIngredients";
import { RecipeMetrics } from "./RecipeMetrics";
import { RecipeCardImage } from "./RecipeCardImage";

interface RecipeCardProps {
  recipe: Recipe;
  pending: boolean;
  onView: (id: string) => void;
  onCook: (id: string) => void;
}

export function RecipeCard({ recipe, pending, onView, onCook }: RecipeCardProps): React.JSX.Element {
  return (
    <article className="overflow-hidden rounded-stitch-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <RecipeCardImage recipe={recipe} />
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="pt-2 text-headline-md">{recipe.title}</h2>
        </div>
        <RecipeMetrics recipe={recipe} />
        <RecipeIngredients ingredients={recipe.ingredients.map((ingredient) => ingredient.displayName)} />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onView(recipe.id)} className="min-h-11 min-w-0 flex-1"><Eye aria-hidden="true" />Details</Button>
          <Button type="button" disabled={pending} onClick={() => onCook(recipe.id)} className="min-h-11 min-w-0 flex-1"><Zap aria-hidden="true" />Cook &amp; Stock</Button>
        </div>
      </div>
    </article>
  );
}
