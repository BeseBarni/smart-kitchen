"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingReview } from "@/features/shopping";
import { useState } from "react";
import type { Recipe } from "../types";
import { RecipeDetailModal } from "./RecipeDetailModal";

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
        {error && <div role="alert" className="space-y-3"><p>Could not load this recipe.</p><Button type="button" onClick={onRetry} className="h-11">Try again</Button></div>}
        {detail && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { setReview(false); onEdit(); }}>Edit</Button>
              <Button type="button" className="min-h-11" onClick={() => { setReview(false); onCook(); }}>Cook &amp; stock</Button>
              <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={onDelete}>Delete recipe</Button>
            </div>
            {detail.ingredients.length > 0 && (review
              ? <ShoppingReview items={detail.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit }))} onDone={() => setReview(false)} />
              : <Button type="button" variant="secondary" className="h-11 w-full" onClick={() => setReview(true)}>Add missing ingredients to list</Button>)}
          </>
        )}
    </RecipeDetailModal>
  );
}
