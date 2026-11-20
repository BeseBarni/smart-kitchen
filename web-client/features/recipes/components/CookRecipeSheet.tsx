"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cookRecipeInputSchema } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import type { CookRecipeInput } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { Recipe } from "../types";

interface Props {
  recipe: Recipe;
  busy: boolean;
  onClose: () => void;
  onSave: (input: CookRecipeInput) => Promise<void>;
}

export function CookRecipeSheet({ recipe, busy, onClose, onSave }: Props): React.JSX.Element {
  const form = useForm<CookRecipeInput>({
    resolver: zodResolver(cookRecipeInputSchema),
    defaultValues: { batches: [{ storageLocation: "fridge", quantity: recipe.servings, unit: "portion" }] },
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      await onSave(input);
      onClose();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Could not stock this recipe." });
    }
  });
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <SheetTitle>Cook &amp; stock {recipe.title}</SheetTitle>
        <SheetDescription>Record a prepared batch in your inventory.</SheetDescription>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
          <label className="block space-y-1 text-label-md">Portions
            <Input type="number" min="0.1" step="0.1" {...form.register("batches.0.quantity", { valueAsNumber: true })} disabled={busy} className="h-11 bg-card" />
          </label>
          <label className="block space-y-1 text-label-md">Storage location
            <select {...form.register("batches.0.storageLocation")} disabled={busy} className="min-h-11 w-full rounded-md border border-border bg-card px-3">
              <option value="fridge">Fridge</option><option value="freezer">Freezer</option><option value="pantry">Pantry</option>
            </select>
          </label>
          {form.formState.errors.root && <p role="alert" className="text-body-sm text-destructive">{form.formState.errors.root.message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full">{busy ? "Stocking..." : "Cook & stock"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
