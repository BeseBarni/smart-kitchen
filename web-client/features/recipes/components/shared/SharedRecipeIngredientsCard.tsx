"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { SharedRecipePublicDto } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { scaleIngredientQuantity } from "../../utils/shared-recipe.utils";

export function SharedRecipeIngredientsCard({ recipe }: { recipe: SharedRecipePublicDto }): React.JSX.Element {
  const { t, formatNumber } = useText();
  const [servings, setServings] = useState(recipe.servings);
  const [checked, setChecked] = useState<Set<number>>(() => new Set<number>());

  const toggle = (index: number): void => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <section className="space-y-3 rounded-stitch-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline-md">{t("recipes.ingredients")}</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={t("recipes.shareDecreaseServings")}
            disabled={servings <= 1}
            onClick={() => setServings((value) => Math.max(1, value - 1))}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span className="min-w-16 text-center text-label-md">
            {formatNumber(servings)} {t("recipes.shareServingsLabel").toLowerCase()}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={t("recipes.shareIncreaseServings")}
            onClick={() => setServings((value) => value + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ul className="space-y-1">
        {recipe.ingredients.map((item, index) => {
          const amount = formatNumber(scaleIngredientQuantity(item.quantity, recipe.servings, servings));
          return (
            <li key={`${item.sortOrder}-${index}`}>
              <label className={`flex min-h-11 items-center gap-3 rounded-lg px-2 text-body-sm ${checked.has(index) ? "text-muted-foreground line-through" : ""}`}>
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={checked.has(index)}
                  onChange={() => toggle(index)}
                />
                <span>{amount} {item.unit} {item.displayName}{item.notes ? ` (${item.notes})` : ""}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
