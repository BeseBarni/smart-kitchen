"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cookRecipeInputSchema } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import type { CookRecipeInput } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { Recipe } from "../types";
import { useText } from "@/lib/i18n";

interface Props {
  recipe: Recipe;
  busy: boolean;
  onClose: () => void;
  onSave: (input: CookRecipeInput) => Promise<void>;
}

export function CookRecipeSheet({ recipe, busy, onClose, onSave }: Props): React.JSX.Element {
  const { t } = useText();
  const form = useForm<CookRecipeInput>({
    resolver: zodResolver(cookRecipeInputSchema),
    defaultValues: { batches: [{ storageLocation: "fridge", quantity: recipe.servings, unit: "portion" }] },
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      await onSave(input);
      onClose();
    } catch (error) {
      console.error("Could not stock recipe:", error);
      form.setError("root", { type: "stock" });
    }
  });
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetTitle className="pr-10">{t("recipes.cookTitle", { name: recipe.title })}</SheetTitle>
        <SheetDescription>{t("recipes.cookDescription")}</SheetDescription>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
          <label className="block space-y-1 text-label-md">{t("recipes.portions")}
            <Input type="number" min="0.1" step="0.1" {...form.register("batches.0.quantity", { valueAsNumber: true })} disabled={busy} className="h-11 bg-card" />
          </label>
          <label className="block space-y-1 text-label-md">{t("inventory.location")}
            <select {...form.register("batches.0.storageLocation")} disabled={busy} className="min-h-11 w-full rounded-md border border-border bg-card px-3">
              <option value="fridge">{t("inventory.fridge")}</option><option value="freezer">{t("inventory.freezer")}</option><option value="pantry">{t("inventory.pantry")}</option>
            </select>
          </label>
          {form.formState.errors.root && <p role="alert" className="text-body-sm text-destructive">{t("recipes.stockError")}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full">{t(busy ? "recipes.stocking" : "recipes.cookStock")}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
