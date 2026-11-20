"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { Recipe } from "../types";

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
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        {loading && <div role="status" className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24 w-full" /></div>}
        {error && <div role="alert" className="space-y-3"><p>Could not load this recipe.</p><Button type="button" onClick={onRetry} className="h-11">Try again</Button></div>}
        {recipe && !loading && (
          <div className="space-y-4">
            <div><SheetTitle>{recipe.title}</SheetTitle><SheetDescription>{recipe.description ?? "Recipe details"}</SheetDescription></div>
            <section><h3 className="text-title-sm">Ingredients</h3><ul className="list-disc pl-5 text-body-md">{recipe.ingredients.map((line) => <li key={line.id}>{line.quantity} {line.unit} {line.displayName}</li>)}</ul></section>
            <section><h3 className="text-title-sm">Instructions</h3><ol className="list-decimal space-y-1 pl-5 text-body-md">{recipe.instructions.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></section>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={onEdit}>Edit</Button>
              <Button type="button" className="min-h-11" onClick={onCook}>Cook &amp; stock</Button>
              <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={onDelete}>Delete recipe</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
