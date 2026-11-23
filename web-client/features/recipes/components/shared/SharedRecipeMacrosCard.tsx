"use client";

import type { SharedRecipePublicDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";

export function SharedRecipeMacrosCard({ recipe }: { recipe: SharedRecipePublicDto }): React.JSX.Element {
  const { t, formatNumber, locale } = useText();
  const macros = [
    { key: "calories", label: t("recipes.shareCalories"), value: recipe.calories, unit: "kcal" },
    { key: "protein", label: t("recipes.protein"), value: recipe.proteinG, unit: "g" },
    { key: "carbs", label: t("recipes.carbs"), value: recipe.carbsG, unit: "g" },
    { key: "fat", label: t("recipes.fat"), value: recipe.fatG, unit: "g" },
  ];
  const storage = [
    { key: "fridge", label: t("recipes.shareFridge"), days: recipe.shelfLifeDays.fridge },
    { key: "freezer", label: t("recipes.shareFreezer"), days: recipe.shelfLifeDays.freezer },
    { key: "pantry", label: t("recipes.sharePantry"), days: recipe.shelfLifeDays.pantry },
  ].filter((entry) => entry.days != null);

  return (
    <section className="rounded-stitch-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(17,24,39,0.04)]" aria-label={t("recipes.sharePerServing")}>
      <p className="mb-3 text-label-md text-muted-foreground">{t("recipes.sharePerServing")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {macros.map(({ key, label, value, unit }) => (
          <div key={key} className="rounded-xl bg-muted p-3 text-center">
            <span className="block text-label-sm text-muted-foreground">{label}</span>
            <strong className="numeric-tabular text-title-sm">
              {value === null ? "—" : `${formatNumber(value)} ${unit}`}
            </strong>
          </div>
        ))}
      </div>
      {storage.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {storage.map(({ key, label, days }) => (
            <span key={key} className="rounded-full border border-border bg-background px-3 py-1.5 text-label-md">
              {label}: {t(
                new Intl.PluralRules(locale).select(days ?? 0) === "one"
                  ? "recipes.shareShelfDay"
                  : "recipes.shareShelfDays",
                { count: formatNumber(days ?? 0) },
              )}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
