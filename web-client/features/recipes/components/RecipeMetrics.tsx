import { Clock3, Flame, Snowflake, UsersRound } from "lucide-react";
import type { Recipe } from "../types";

export function RecipeMetrics({ recipe }: { recipe: Recipe }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2 rounded-lg bg-muted px-2.5 py-2 text-label-md text-muted-foreground">
      <span className="flex items-center gap-1.5"><Clock3 size={16} className="shrink-0 text-primary" aria-hidden="true" />{recipe.prepMinutes} min prep</span>
      <span className="flex items-center gap-1.5"><UsersRound size={16} className="shrink-0 text-primary" aria-hidden="true" />{recipe.portions} portions</span>
      <span className="flex items-center gap-1.5"><Snowflake size={16} className="shrink-0" aria-hidden="true" />{recipe.storageLabel}</span>
      <span className="flex items-center gap-1.5"><Flame size={16} className="shrink-0 text-warning" aria-hidden="true" /><span className="numeric-tabular">{recipe.calories} kcal</span></span>
    </div>
  );
}
