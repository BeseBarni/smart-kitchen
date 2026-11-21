"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createRecipeSchema } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import type { CreateRecipeInput, RecipeDto } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { recipeFormValues } from "../utils/recipe-form.mapper";
import { useText } from "@/lib/i18n";
import { ImageUploadField } from "@/components/media/ImageUploadField";
import type { UploadedImage } from "@/lib/media/media-upload.client";
import { useState } from "react";

interface Props {
  recipe?: RecipeDto;
  busy: boolean;
  onClose: () => void;
  onSave: (input: CreateRecipeInput) => Promise<void>;
}

export function RecipeFormSheet({ recipe, busy, onClose, onSave }: Props): React.JSX.Element {
  const { t } = useText();
  const [coverUrl, setCoverUrl] = useState<string | null>(recipe?.imageUrl ?? null);
  const form = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: recipeFormValues(recipe),
  });
  const submit = form.handleSubmit(async (input) => {
    if (input.fiberPerServing === null || input.fiberPerServing === undefined) {
      form.setError("fiberPerServing", { type: "required" });
      return;
    }
    try {
      await onSave({ ...input, title: input.title.trim(), description: input.description?.trim() || null });
      onClose();
    } catch (error) {
      console.error("Could not save recipe:", error);
      form.setError("root", { type: "save" });
    }
  });
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <SheetTitle>{t(recipe ? "recipes.editTitle" : "recipes.newTitle")}</SheetTitle>
        <SheetDescription>{t("recipes.formDescription")}</SheetDescription>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
          <ImageUploadField
            purpose="recipe_cover"
            variant="cover"
            labels={{
              choose: t("chat.chooseLibrary"),
              camera: t("chat.takePhoto"),
              replace: t("chat.chooseLibrary"),
              remove: t("chat.removePhoto"),
              uploading: t("chat.uploading"),
            }}
            valueUrl={coverUrl}
            disabled={busy}
            onUploaded={(image: UploadedImage) => {
              setCoverUrl(image.previewUrl);
              form.setValue("imageAssetId", image.assetId);
              form.setValue("imageUrl", image.url);
            }}
            onRemoved={() => {
              setCoverUrl(null);
              form.setValue("imageAssetId", null);
              form.setValue("imageUrl", null);
            }}
          />
          <label className="block space-y-1 text-label-md">{t("recipes.name")}
            <Input {...form.register("title")} disabled={busy} className="h-11 bg-card" />
          </label>
          {form.formState.errors.title && <p role="alert" className="text-body-sm text-destructive">{t("inventory.invalidField")}</p>}
          <label className="block space-y-1 text-label-md">{t("recipes.description")}
            <Input {...form.register("description")} disabled={busy} className="h-11 bg-card" />
          </label>
          <label className="block space-y-1 text-label-md">{t("recipes.servings")}
            <Input type="number" step="0.5" {...form.register("servings", { valueAsNumber: true })} disabled={busy} className="h-11 bg-card" />
          </label>
          {form.formState.errors.servings && <p role="alert" className="text-body-sm text-destructive">{t("inventory.invalidField")}</p>}
          <label className="block space-y-1 text-label-md">{t("recipes.fiberPerServing")}
            <Input type="number" min="0" step="0.01" {...form.register("fiberPerServing", { setValueAs: (value: string) => value === "" ? null : Number(value) })} disabled={busy} className="h-11 bg-card" />
          </label>
          {form.formState.errors.fiberPerServing && <p role="alert" className="text-body-sm text-destructive">{t(form.formState.errors.fiberPerServing.type === "required" ? "recipes.fiberRequired" : "inventory.invalidField")}</p>}
          <label className="flex min-h-11 items-center gap-2 text-body-md">
            <input type="checkbox" {...form.register("isFreezerFriendly")} disabled={busy} className="size-5 accent-primary" />
            {t("recipes.freezerFriendly")}
          </label>
          {form.formState.errors.root && <p role="alert" className="text-body-sm text-destructive">{t("recipes.saveError")}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full">{t(busy ? "recipes.saving" : "recipes.save")}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
