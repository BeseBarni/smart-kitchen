"use client";

import type { ReactNode } from "react";
import { Soup, X } from "lucide-react";
import Image from "next/image";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { LOCALE_META, useText } from "@/lib/i18n";

type DetailRecipe = {
  title: string;
  description: string | null;
  imageUrl?: string | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  servings: number;
  caloriesPerServing?: number | null;
  proteinPerServing?: number | null;
  carbsPerServing?: number | null;
  fatPerServing?: number | null;
  fiberPerServing?: number | null;
  ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string | null }>;
  instructions: string[];
};

export function RecipeDetailModal({ open, onClose, recipe, markdown = false, children }: {
  open: boolean;
  onClose: () => void;
  recipe?: DetailRecipe;
  markdown?: boolean;
  children?: ReactNode;
}): React.JSX.Element {
  const { t, locale, formatNumber } = useText();
  const macros = [
    { name: t("recipes.protein"), value: recipe?.proteinPerServing },
    { name: t("recipes.carbs"), value: recipe?.carbsPerServing },
    { name: t("recipes.fat"), value: recipe?.fatPerServing },
    { name: t(markdown ? "recipes.estimatedFiber" : "recipes.fiber"), value: recipe?.fiberPerServing },
  ];
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] w-full max-w-[430px] gap-0 overflow-hidden rounded-t-[28px] p-0">
        <div className="relative border-b px-4 py-4 pr-16">
          <SheetTitle>{t("recipes.detailsTitle")}</SheetTitle>
          <SheetDescription>{t("recipes.detailsDescription")}</SheetDescription>
          <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 size-11" onClick={onClose} aria-label={t("recipes.closeDetails")}><X size={20} aria-hidden="true" /></Button>
        </div>
        <div className="space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {recipe && <>
            <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-secondary-foreground">
              {recipe.imageUrl ? <Image src={recipe.imageUrl} alt="" fill unoptimized sizes="(max-width: 430px) 100vw, 430px" className="object-cover" /> : <Soup size={64} strokeWidth={1} aria-hidden="true" />}
            </div>
            <div>
              <h3 className="text-headline-lg">{recipe.title}</h3>
              {recipe.description && (markdown ? <MarkdownContent text={recipe.description} className="text-body-sm text-muted-foreground" /> : <p className="text-body-sm text-muted-foreground">{recipe.description}</p>)}
              <p className="mt-1 text-label-md text-muted-foreground">{t(new Intl.PluralRules(LOCALE_META[locale].tag).select(recipe.servings) === "one" ? "recipes.servingsOne" : "recipes.servingsOther", { count: formatNumber(recipe.servings) })}{recipe.caloriesPerServing != null ? ` · ${t("recipes.caloriesPerServing", { count: formatNumber(recipe.caloriesPerServing) })}` : ""}</p>
              {(recipe.prepTimeMin != null || recipe.cookTimeMin != null) && <p className="text-label-md text-muted-foreground">{recipe.prepTimeMin != null ? t("recipes.prepTime", { count: formatNumber(recipe.prepTimeMin) }) : ""}{recipe.prepTimeMin != null && recipe.cookTimeMin != null ? " · " : ""}{recipe.cookTimeMin != null ? t("recipes.cookTime", { count: formatNumber(recipe.cookTimeMin) }) : ""}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {macros.map((macro) => <div key={macro.name} className="rounded-xl border border-primary/20 bg-secondary p-2 text-center"><span className="block text-label-sm text-primary">{macro.name}</span><strong className="tabular-nums">{macro.value == null ? "—" : `${formatNumber(macro.value)} g`}</strong></div>)}
            </div>
            <section className="space-y-2">
              <h3 className="text-title-sm">{t("recipes.ingredientsChecklist")}</h3>
              <div className="space-y-1 rounded-2xl bg-muted p-3">
                {recipe.ingredients.map((item, index) => <label key={index} className="flex min-h-11 items-center gap-3 text-body-sm"><input type="checkbox" /><span>{item.quantity} {item.unit} {item.name}{item.notes ? ` (${item.notes})` : ""}</span></label>)}
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-title-sm">{t("recipes.steps")}</h3>
              <ol className="space-y-2">
                {recipe.instructions.map((step, index) => <li key={index} className="flex gap-3 rounded-2xl border p-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">{index + 1}</span>{markdown ? <MarkdownContent text={step} className="text-body-sm" /> : <span className="text-body-sm">{step}</span>}</li>)}
              </ol>
            </section>
          </>}
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
