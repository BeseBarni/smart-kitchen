import type { InventoryDetail } from "../../types";
import { useText } from "@/lib/i18n";

interface Props { item: InventoryDetail }

export function MealIngredientsList({ item }: Props): React.JSX.Element | null {
  const { t, formatNumber } = useText();
  if (!item.recipe) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h3 className="mb-3 text-title-sm">{t("inventory.detailIngredients")}</h3>
      <ol className="space-y-2">
        {item.recipe.ingredients.map((ingredient, index) => (
          <li key={`${ingredient.ingredientId ?? ingredient.displayName}-${index}`} className="border-b border-border pb-2 last:border-0">
            <p className="text-body-md">{ingredient.displayName}</p>
            <p className="text-label-sm text-muted-foreground">
              {formatNumber(ingredient.quantity)} {ingredient.unit}
              {ingredient.notes ? ` - ${ingredient.notes}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
