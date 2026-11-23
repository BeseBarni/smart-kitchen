"use client";

import type { SharedRecipePublicDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";

export function SharedRecipeInstructionsCard({ recipe }: { recipe: SharedRecipePublicDto }): React.JSX.Element {
  const { t } = useText();
  return (
    <section className="space-y-3 rounded-stitch-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <h2 className="text-headline-md">{t("recipes.shareInstructions")}</h2>
      <ol className="space-y-2">
        {recipe.instructions.map((step, index) => (
          <li key={index} className="flex gap-3 rounded-xl border border-border bg-background p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-label-sm text-primary-foreground">
              {index + 1}
            </span>
            <span className="text-body-md">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
