import { Clock3, Flame, Snowflake, UsersRound } from "lucide-react";
import type { Recipe } from "../types";
import { LOCALE_META, useText } from "@/lib/i18n";

export function RecipeMetrics({ recipe }: { recipe: Recipe }): React.JSX.Element {
  const { t, locale, formatNumber } = useText();
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2 rounded-lg bg-muted px-2.5 py-2 text-label-md text-foreground">
      <span className="flex items-center gap-1.5"><Clock3 size={16} className="shrink-0 text-primary" aria-hidden="true" />{t("recipes.prepTime", { count: recipe.prepTimeMin == null ? "—" : formatNumber(recipe.prepTimeMin) })}</span>
      <span className="flex items-center gap-1.5"><UsersRound size={16} className="shrink-0 text-primary" aria-hidden="true" />{t(new Intl.PluralRules(LOCALE_META[locale].tag).select(recipe.servings) === "one" ? "recipes.servingsOne" : "recipes.servingsOther", { count: formatNumber(recipe.servings) })}</span>
      <span className="flex items-center gap-1.5"><Snowflake size={16} className="shrink-0" aria-hidden="true" />{t(recipe.isFreezerFriendly ? "recipes.freezerFriendly" : "recipes.freshPrep")}</span>
      <span className="flex items-center gap-1.5"><Flame size={16} className="shrink-0 text-warning" aria-hidden="true" /><span className="numeric-tabular">{t("recipes.caloriesPerServing", { count: recipe.caloriesPerServing == null ? "—" : formatNumber(recipe.caloriesPerServing) })}</span></span>
    </div>
  );
}
