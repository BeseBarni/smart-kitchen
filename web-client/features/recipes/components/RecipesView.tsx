"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CookRecipeInput, CreateRecipeInput } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecipe, useRecipeMutations, useRecipes } from "../hooks/use-recipes";
import { useRecipesUiStore } from "../stores/recipes-ui.store";
import type { Recipe } from "../types";
import { filterRecipes, recipeCounts } from "../utils/recipes-selectors";
import { CookRecipeSheet } from "./CookRecipeSheet";
import { RecipeDetailsSheet } from "./RecipeDetailsSheet";
import { RecipeFormSheet } from "./RecipeFormSheet";
import { RecipesFilters } from "./RecipesFilters";
import { RecipesHeader } from "./RecipesHeader";
import { RecipesList } from "./RecipesList";

export function RecipesView(): React.JSX.Element {
  const { search, filter, setSearch, setFilter } = useRecipesUiStore();
  const query = useRecipes({
    ...(filter === "ai-generated" ? { source: "ai_skill" } : {}),
    ...(filter === "freezer-friendly" ? { isFreezerFriendly: "true" } : {}),
    ...(filter === "quick" ? { maxPrepTimeMin: 29 } : {}),
  });
  const mutations = useRecipeMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cookId, setCookId] = useState<string | null>(null);
  const [formRecipe, setFormRecipe] = useState<Recipe>();
  const [formOpen, setFormOpen] = useState(false);
  const detail = useRecipe(selectedId);
  const cooking = useRecipe(cookId);
  const recipes = query.data ?? [];
  const filtered = filterRecipes(recipes, filter, search);
  const counts = recipeCounts(recipes);
  const busy = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending || mutations.cookAndStock.isPending;

  const saveRecipe = async (input: CreateRecipeInput): Promise<void> => {
    if (formRecipe) await mutations.update.mutateAsync({ id: formRecipe.id, input });
    else await mutations.create.mutateAsync(input);
    toast.success("Recipe saved.");
    setFormOpen(false);
    setFormRecipe(undefined);
  };
  const deleteRecipe = async (): Promise<void> => {
    if (!selectedId) return;
    try {
      await mutations.remove.mutateAsync(selectedId);
      toast.success("Recipe deleted.");
      setSelectedId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this recipe.");
    }
  };
  const cookRecipe = async (input: CookRecipeInput): Promise<void> => {
    if (!cookId) throw new Error("No recipe selected.");
    const stocked = await mutations.cookAndStock.mutateAsync({ id: cookId, input });
    toast.success(`${stocked.length} ${stocked.length === 1 ? "batch" : "batches"} stocked.`);
    setCookId(null);
  };
  const editSelectedRecipe = (): void => {
    if (!detail.data) return;
    setFormRecipe(detail.data);
    setSelectedId(null);
    setFormOpen(true);
  };

  if (query.isPending) return <div role="status" aria-label="Loading recipes" className="space-y-3 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-80 w-full" /></div>;
  if (query.isError && !query.data) return <div role="alert" className="space-y-3 py-8"><p>Could not load recipes.</p><Button type="button" className="h-11" onClick={() => void query.refetch()}>Try again</Button></div>;

  return (
    <div className="space-y-3 pb-8">
      <RecipesHeader total={counts.total} search={search} onSearch={setSearch} onNew={() => { setFormRecipe(undefined); setFormOpen(true); }} />
      <RecipesFilters filter={filter} total={counts.total} onChange={setFilter} />
      {query.isError && <div role="alert" className="space-y-2 text-body-sm"><p>Could not refresh recipes. Showing the last loaded results.</p><Button type="button" variant="outline" className="h-11" onClick={() => void query.refetch()}>Try again</Button></div>}
      <RecipesList recipes={filtered} total={counts.total} pending={busy} onView={setSelectedId} onCook={setCookId} />
      <RecipeDetailsSheet
        key={selectedId ?? "none"}
        recipe={detail.data}
        open={Boolean(selectedId)}
        loading={detail.isPending}
        error={detail.isError ? detail.error : null}
        onClose={() => setSelectedId(null)}
        onRetry={() => void detail.refetch()}
        onEdit={editSelectedRecipe}
        onDelete={() => void deleteRecipe()}
        onCook={() => { if (selectedId) setCookId(selectedId); setSelectedId(null); }}
      />
      {formOpen && <RecipeFormSheet key={formRecipe?.id ?? "new"} recipe={formRecipe} busy={busy} onClose={() => { setFormOpen(false); setFormRecipe(undefined); }} onSave={saveRecipe} />}
      {cookId && cooking.data && <CookRecipeSheet key={cookId} recipe={cooking.data} busy={busy} onClose={() => setCookId(null)} onSave={cookRecipe} />}
      {cookId && cooking.isError && <div role="alert" className="py-2"><p>Could not load this recipe for cooking.</p><Button type="button" className="h-11" onClick={() => void cooking.refetch()}>Try again</Button></div>}
    </div>
  );
}
