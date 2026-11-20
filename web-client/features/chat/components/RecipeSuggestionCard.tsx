"use client";

import { useState } from "react";
import { BookmarkPlus, Clock3, CookingPot, Soup, UsersRound } from "lucide-react";
import type { CreateRecipeInput } from "@app/modules/schemas";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useRecipeMutations, useRecipes } from "@/features/recipes";
import type { UiDirective } from "../types";

type Props = Extract<UiDirective, { component: "recipe_preview_card" }>;
type StorageLocation = "fridge" | "freezer" | "pantry";

function isStorageLocation(value: string): value is StorageLocation {
  return value === "fridge" || value === "freezer" || value === "pantry";
}

export function RecipeSuggestionCard({ recipe, status, canSave, canCookAndStock }: Props): React.JSX.Element {
  const { create, cookAndStock } = useRecipeMutations();
  const savedRecipes = useRecipes({ search: recipe.title, limit: 100 });
  const [storageLocation, setStorageLocation] = useState<StorageLocation>("fridge");
  const [quantity, setQuantity] = useState(String(recipe.servings));
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(recipe.id ?? null);
  const existingRecipe = savedRecipes.data?.find((saved) => saved.title === recipe.title);
  const effectiveRecipeId = savedRecipeId ?? existingRecipe?.id ?? null;
  const createInput: CreateRecipeInput = {
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    imageUrl: null,
    prepTimeMin: null,
    cookTimeMin: null,
    servings: recipe.servings,
    isFreezerFriendly: false,
    source: "ai_skill",
    ingredients: recipe.ingredients.map((ingredient, sortOrder) => ({
      ingredientId: null,
      displayName: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      notes: null,
      sortOrder,
    })),
    caloriesPerServing: recipe.caloriesPerServing ?? null,
    proteinPerServing: recipe.proteinPerServing ?? null,
    carbsPerServing: recipe.carbsPerServing ?? null,
    fatPerServing: recipe.fatPerServing ?? null,
    costPerServing: recipe.currency ? recipe.costPerServing ?? null : null,
    currency: recipe.currency ?? "USD",
  };
  const parsedQuantity = Number(quantity);

  return (
    <Card className="gap-0 rounded-2xl border border-border py-0 shadow-[0_1px_3px_rgba(17,24,39,0.04)] ring-0">
      <div className="relative flex h-36 items-center justify-center bg-secondary text-secondary-foreground">
        <Soup size={56} strokeWidth={1} role="img" aria-label="Recipe illustration" />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <Badge className="bg-card text-foreground"><Clock3 aria-hidden="true" />{recipe.instructions.length} steps</Badge>
          <Badge className="bg-card text-foreground"><UsersRound aria-hidden="true" />{recipe.servings} servings</Badge>
        </div>
        <Badge className="absolute bottom-2.5 left-2.5 bg-primary text-primary-foreground">{status === "saved" ? "Saved recipe" : "Recipe draft"}</Badge>
      </div>
      <div className="space-y-2 p-3.5">
        <div>
          <h3 className="text-headline-md">{recipe.title}</h3>
          {status === "draft"
            ? <MarkdownContent text={recipe.description} className="mt-0.5 text-body-sm text-muted-foreground" />
            : <p className="mt-0.5 text-body-sm text-muted-foreground">{recipe.description}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {recipe.ingredients.map((ingredient, index) => <Badge key={`${ingredient.name}-${index}`} variant="outline" className="h-auto rounded-lg bg-muted px-2.5 py-1 text-label-sm text-muted-foreground">{ingredient.name}</Badge>)}
        </div>
        {canSave && status === "draft" && !effectiveRecipeId && (
          <Button type="button" className="h-11 w-full rounded-xl" disabled={create.isPending || savedRecipes.isPending || savedRecipes.isError} onClick={() => create.mutate(createInput, {
            onSuccess: (savedRecipe) => {
              setSavedRecipeId(savedRecipe.id);
              toast.success("Recipe saved.");
            },
          })}>
            <BookmarkPlus aria-hidden="true" />{create.isPending ? "Saving..." : "Save Recipe"}
          </Button>
        )}
        {savedRecipes.isError && <p role="alert" className="text-label-md text-destructive">Could not check saved recipes: {savedRecipes.error.message}</p>}
        {create.isError && <p role="alert" className="text-label-md text-destructive">Could not save this recipe: {create.error.message}</p>}
        {(canCookAndStock || effectiveRecipeId !== null) && effectiveRecipeId && (
          <div className="space-y-2 rounded-xl bg-muted p-3">
            <h4 className="text-title-sm">Cook and stock</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-label-md">
                <span>Portions</span>
                <input type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-card px-3" />
              </label>
              <label className="space-y-1 text-label-md">
                <span>Storage</span>
                <select value={storageLocation} onChange={(event) => {
                  if (isStorageLocation(event.target.value)) setStorageLocation(event.target.value);
                }} className="h-11 w-full rounded-lg border border-border bg-card px-3">
                  <option value="fridge">Fridge</option>
                  <option value="freezer">Freezer</option>
                  <option value="pantry">Pantry</option>
                </select>
              </label>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-xl"
              disabled={cookAndStock.isPending || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0}
              onClick={() => cookAndStock.mutate({ id: effectiveRecipeId, input: { batches: [{ storageLocation, quantity: parsedQuantity, unit: "portions" }] } }, {
                onSuccess: () => toast.success("Recipe cooked and added to inventory."),
              })}
            >
              <CookingPot aria-hidden="true" />{cookAndStock.isPending ? "Stocking..." : "Cook & stock"}
            </Button>
            {cookAndStock.isError && <p role="alert" className="text-label-md text-destructive">Could not stock this recipe: {cookAndStock.error.message}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
