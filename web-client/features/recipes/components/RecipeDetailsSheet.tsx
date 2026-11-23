"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingReview } from "@/features/shopping";
import { useState } from "react";
import type { Recipe } from "../types";
import { RecipeDetailModal } from "./RecipeDetailModal";
import { ShareRecipeSheet } from "./ShareRecipeSheet";
import { useText } from "@/lib/i18n";

interface Props {
  recipe?: Recipe;
  open: boolean;
  loading: boolean;
  error?: Error | null;
  onClose: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCook: () => void;
}

export function RecipeDetailsSheet({ recipe, open, loading, error, onClose, onRetry, onEdit, onDelete, onCook }: Props): React.JSX.Element {
  const { t } = useText();
  const [review, setReview] = useState(false);
  const detail = recipe && !loading ? {
    ...recipe,
    ingredients: recipe.ingredients.map((line) => ({ name: line.displayName, quantity: line.quantity, unit: line.unit, notes: line.notes })),
  } : undefined;
  const close = (): void => {
    setReview(false);
    onClose();
  };
  return (
    <RecipeDetailModal open={open} onClose={close} recipe={detail} markdown={recipe?.source === "ai_skill"}>
        {loading && <div role="status" className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24 w-full" /></div>}
        {error && <div role="alert" className="space-y-3"><p>{t("recipes.loadError")}</p><Button type="button" onClick={onRetry} className="h-11">{t("common.retry")}</Button></div>}
        {detail && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { setReview(false); onEdit(); }}>{t("recipes.edit")}</Button>
              <Button type="button" className="min-h-11" onClick={() => { setReview(false); onCook(); }}>{t("recipes.cookStock")}</Button>
              <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={onDelete}>{t("recipes.deleteRecipe")}</Button>
            </div>
            <ShareRecipeSheet
              recipeId={detail.id}
              shareToken={detail.shareToken}
              sharedAt={detail.sharedAt}
            />
            {detail.ingredients.length > 0 && (review
              ? <ShoppingReview items={detail.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit }))} onDone={() => setReview(false)} />
              : <Button type="button" variant="secondary" className="h-11 w-full" onClick={() => setReview(true)}>{t("recipes.addMissing")}</Button>)}
          </>
        )}
    </RecipeDetailModal>
  );
}
