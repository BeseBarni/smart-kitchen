"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavoriteMutation, usePendingFavorites, useRecipes } from "../hooks/use-recipes";
import { useRecipesUiStore } from "../stores/recipes-ui.store";
import type { Recipe } from "../types";
import { filterRecipes, recipeCounts } from "../utils/recipes-selectors";
import { RecipesFilters } from "./RecipesFilters";
import { RecipesHeader } from "./RecipesHeader";
import { RecipesList } from "./RecipesList";

export function RecipesView(): React.JSX.Element {
  const query = useRecipes();
  const favorite = useFavoriteMutation();
  const pendingIds = usePendingFavorites();
  const pending = useRef(new Set<string>());
  const { search, filter, setSearch, setFilter } = useRecipesUiStore();

  const setFavorite = async (recipe: Recipe): Promise<void> => {
    if (pending.current.has(recipe.id)) return;
    pending.current.add(recipe.id);
    try {
      await favorite.mutateAsync({ id: recipe.id, favorite: !recipe.favorite });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update favorite.");
    } finally {
      pending.current.delete(recipe.id);
    }
  };

  if (query.isPending) return <div role="status" aria-label="Loading recipes" className="space-y-3 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-80 w-full" /></div>;
  if (query.isError && !query.data) return <div role="alert" className="space-y-3 py-8"><p>Could not load demo recipes.</p><Button type="button" className="h-11" onClick={() => void query.refetch()}>Try again</Button></div>;

  const recipes = query.data ?? [];
  const counts = recipeCounts(recipes);
  return (
    <div className="space-y-3 pb-8">
      <RecipesHeader total={counts.total} favorites={counts.favorites} search={search} onSearch={setSearch} />
      <RecipesFilters filter={filter} total={counts.total} onChange={setFilter} />
      <p className="text-body-sm text-muted-foreground">Demo recipes · stock labels are illustrative, not synced.</p>
      {query.isError && <div role="alert" className="space-y-2 text-body-sm"><p>Could not refresh demo recipes. Showing the last loaded results.</p><Button type="button" variant="outline" className="h-11" onClick={() => void query.refetch()}>Try again</Button></div>}
      <RecipesList recipes={filterRecipes(recipes, filter, search)} total={counts.total} pendingIds={pendingIds} onFavorite={(recipe) => void setFavorite(recipe)} />
    </div>
  );
}
