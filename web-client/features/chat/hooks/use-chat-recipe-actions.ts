"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { CreateRecipeInput } from "@app/modules/schemas";
import { toast } from "sonner";
import { useRecipeMutations, useRecipes } from "@/features/recipes";
import type { UiDirective } from "../types";
import { getText } from "@/lib/i18n";

type RecipeDirective = Extract<UiDirective, { component: "recipe_preview_card" }>;
type StorageLocation = "fridge" | "freezer" | "pantry";
export type ChatRecipeActionsState = {
  showSave: boolean;
  savePending: boolean;
  saveDisabled: boolean;
  save: () => void;
  existingId: string | null;
  quantity: string;
  setQuantity: Dispatch<SetStateAction<string>>;
  location: StorageLocation;
  setLocation: Dispatch<SetStateAction<StorageLocation>>;
  cookPending: boolean;
  cookDisabled: boolean;
  cook: (id: string) => void;
};

export function recipeDraftCreateInput(recipe: RecipeDirective["recipe"], assistantResponse?: string): CreateRecipeInput {
  return {
    title: recipe.title, description: recipe.description, instructions: recipe.instructions,
    assistantResponse: assistantResponse || null,
    imageUrl: recipe.imageUrl ?? null, stockImageKind: recipe.stockImageKind ?? null,
    stockImageName: recipe.stockImageName ?? null, prepTimeMin: recipe.prepTimeMin ?? null, cookTimeMin: recipe.cookTimeMin ?? null, servings: recipe.servings,
    isFreezerFriendly: recipe.isFreezerFriendly ?? false, source: "ai_skill",
    ingredients: recipe.ingredients.map((ingredient, sortOrder) => ({
      ingredientId: null, displayName: ingredient.name, quantity: ingredient.quantity,
      unit: ingredient.unit, notes: ingredient.notes ?? null, sortOrder,
    })),
    caloriesPerServing: recipe.caloriesPerServing ?? null,
    proteinPerServing: recipe.proteinPerServing ?? null,
    carbsPerServing: recipe.carbsPerServing ?? null,
    fatPerServing: recipe.fatPerServing ?? null,
    fiberPerServing: recipe.fiberPerServing ?? null,
    costPerServing: recipe.currency ? recipe.costPerServing ?? null : null,
    currency: recipe.currency ?? "USD",
    shelfLifeDays: recipe.shelfLifeDays,
    tags: recipe.tags,
  };
}

export function useChatRecipeActions({ recipe, status, canSave, assistantResponse, streaming }: RecipeDirective & { assistantResponse: string; streaming: boolean }): ChatRecipeActionsState {
  const { create, cookAndStock } = useRecipeMutations();
  const savedRecipes = useRecipes({ search: recipe.title, limit: 100 });
  useEffect(() => {
    if (savedRecipes.error) toast.error(getText("chat.savedRecipeLookupError"), { id: "chat-recipe-lookup-error" });
  }, [savedRecipes.error]);
  const [savedId, setSavedId] = useState<string | null>(recipe.id ?? null);
  const [location, setLocation] = useState<StorageLocation>("fridge");
  const [quantity, setQuantity] = useState(String(recipe.servings));
  const existingId = savedId ?? savedRecipes.data?.find((saved) => saved.title === recipe.title)?.id ?? null;
  const createInput = recipeDraftCreateInput(recipe, assistantResponse);
  const parsedQuantity = Number(quantity);
  return {
    showSave: canSave && status === "draft" && !existingId,
    savePending: create.isPending,
    saveDisabled: streaming || create.isPending || savedRecipes.isPending || savedRecipes.isError || recipe.fiberPerServing == null,
    save: () => create.mutate(createInput, {
      onSuccess: (saved) => { setSavedId(saved.id); toast.success(getText("recipes.saved")); },
      onError: () => toast.error(getText("chat.saveRecipeError")),
    }),
    existingId,
    quantity,
    setQuantity,
    location,
    setLocation,
    cookPending: cookAndStock.isPending,
    cookDisabled: cookAndStock.isPending || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0,
    cook: (id: string) => cookAndStock.mutate({ id, input: { batches: [{ storageLocation: location, quantity: parsedQuantity, unit: "portions" }] } }, {
      onSuccess: () => toast.success(getText("chat.stockedRecipe")),
      onError: () => toast.error(getText("chat.stockRecipeError")),
    }),
  };
}
