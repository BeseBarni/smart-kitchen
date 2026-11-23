"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Soup } from "lucide-react";
import type { SharedRecipePublicDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { sharedTagLabel } from "../../utils/shared-recipe.utils";

const colorClasses: Readonly<Record<string, string>> = {
  primary: "bg-primary/10 text-primary",
  positive: "bg-secondary text-secondary-foreground",
  info: "border border-border bg-card text-muted-foreground",
  warning: "bg-warning-surface text-warning",
  neutral: "border border-border bg-card text-muted-foreground",
};

export function SharedRecipeHero({ recipe }: { recipe: SharedRecipePublicDto }): React.JSX.Element {
  const { t, formatNumber } = useText();
  const [imageFailed, setImageFailed] = useState(false);
  const image = recipe.imageUrls.large;
  const metadata = [
    recipe.prepTimeMin === null ? null : `${t("recipes.sharePrep")} ${formatNumber(recipe.prepTimeMin)} min`,
    recipe.cookTimeMin === null ? null : `${t("recipes.shareCook")} ${formatNumber(recipe.cookTimeMin)} min`,
    `${formatNumber(recipe.servings)} ${t("recipes.shareServingsLabel").toLowerCase()}`,
  ].filter((value): value is string => value !== null);

  return (
    <section className="space-y-4">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-stitch-xl bg-secondary text-secondary-foreground">
        {image && !imageFailed
          ? <img src={image} alt={recipe.title} className="size-full object-cover" onError={() => setImageFailed(true)} />
          : <Soup size={64} strokeWidth={1} aria-hidden="true" />}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-3 py-1.5 text-label-sm text-primary-foreground">{t("recipes.shareMealType")}</span>
          {recipe.tags.slice(0, 3).map((tag) => (
            <span key={tag.slug} className={`rounded-full px-3 py-1.5 text-label-sm ${colorClasses[tag.colorToken ?? "neutral"] ?? colorClasses.neutral}`}>
              {sharedTagLabel(tag, t)}
            </span>
          ))}
        </div>
        <h1 className="text-headline-lg-mobile sm:text-headline-lg">{recipe.title}</h1>
        {recipe.description && <p className="text-body-md text-muted-foreground">{recipe.description}</p>}
        <p className="text-label-md text-muted-foreground">{metadata.join(" · ")}</p>
      </div>
    </section>
  );
}
