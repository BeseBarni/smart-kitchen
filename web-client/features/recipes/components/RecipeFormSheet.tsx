"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createRecipeSchema } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import type { CreateRecipeInput, RecipeDto } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { recipeFormValues } from "../utils/recipe-form.mapper";

interface Props {
  recipe?: RecipeDto;
  busy: boolean;
  onClose: () => void;
  onSave: (input: CreateRecipeInput) => Promise<void>;
}

export function RecipeFormSheet({ recipe, busy, onClose, onSave }: Props): React.JSX.Element {
  const form = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: recipeFormValues(recipe),
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      await onSave({ ...input, title: input.title.trim(), description: input.description?.trim() || null });
      onClose();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Could not save this recipe." });
    }
  });
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <SheetTitle>{recipe ? "Edit recipe" : "New recipe"}</SheetTitle>
        <SheetDescription>Save a recipe to your library.</SheetDescription>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
          <label className="block space-y-1 text-label-md">Recipe name
            <Input {...form.register("title")} disabled={busy} className="h-11 bg-card" />
          </label>
          {form.formState.errors.title && <p role="alert" className="text-body-sm text-destructive">{form.formState.errors.title.message}</p>}
          <label className="block space-y-1 text-label-md">Description
            <Input {...form.register("description")} disabled={busy} className="h-11 bg-card" />
          </label>
          <label className="block space-y-1 text-label-md">Servings
            <Input type="number" step="0.5" {...form.register("servings", { valueAsNumber: true })} disabled={busy} className="h-11 bg-card" />
          </label>
          {form.formState.errors.servings && <p role="alert" className="text-body-sm text-destructive">{form.formState.errors.servings.message}</p>}
          <label className="flex min-h-11 items-center gap-2 text-body-md">
            <input type="checkbox" {...form.register("isFreezerFriendly")} disabled={busy} className="size-5 accent-primary" />
            Freezer friendly
          </label>
          {form.formState.errors.root && <p role="alert" className="text-body-sm text-destructive">{form.formState.errors.root.message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full">{busy ? "Saving..." : "Save recipe"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
