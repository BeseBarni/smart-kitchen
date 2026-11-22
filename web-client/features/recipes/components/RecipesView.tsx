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
import { getText, LOCALE_META, useText } from "@/lib/i18n";
import { languageStore } from "@/lib/i18n/language.store";
import { getErrorText } from "@/lib/i18n/error-text";

export function RecipesView(): React.JSX.Element {
  const { t } = useText();
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
    const onSuccess = (): void => { toast.success(getText("recipes.saved")); };
    if (formRecipe) mutations.update.mutate({ id: formRecipe.id, input }, { onSuccess });
    else mutations.create.mutate(input, { onSuccess });
    setFormOpen(false);
    setFormRecipe(undefined);
  };
  const deleteRecipe = async (): Promise<void> => {
    if (!selectedId) return;
    try {
      mutations.remove.mutate(selectedId);
      toast.success(getText("recipes.deleted"));
      setSelectedId(null);
    } catch (error) {
      toast.error(getErrorText(error, "recipes.deleteError"));
    }
  };
  const cookRecipe = async (input: CookRecipeInput): Promise<void> => {
    if (!cookId) throw new Error("No recipe selected.");
    mutations.cookAndStock.mutate({ id: cookId, input }, {
      onSuccess: (stocked) => {
        const locale = languageStore.getState().locale;
        const key = new Intl.PluralRules(LOCALE_META[locale].tag).select(stocked.length) === "one" ? "recipes.batchesOne" : "recipes.batchesOther";
        toast.success(getText(key, { count: new Intl.NumberFormat(LOCALE_META[locale].tag).format(stocked.length) }));
      },
    });
    setCookId(null);
  };
  const editSelectedRecipe = (): void => {
    if (!detail.data) return;
    setFormRecipe(detail.data);
    setSelectedId(null);
    setFormOpen(true);
  };

  if (query.isPending) return <div role="status" aria-label={t("recipes.loading")} className="space-y-3 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-80 w-full" /></div>;
  if (query.isError && !query.data) return <div role="alert" className="space-y-3 py-8"><p>{t("recipes.loadAllError")}</p><Button type="button" className="h-11" onClick={() => void query.refetch()}>{t("common.retry")}</Button></div>;

  return (
    <div className="space-y-3 pb-8">
      <RecipesHeader total={counts.total} search={search} onSearch={setSearch} onNew={() => { setFormRecipe(undefined); setFormOpen(true); }} />
      <RecipesFilters filter={filter} total={counts.total} onChange={setFilter} />
      {query.isError && <div role="alert" className="space-y-2 text-body-sm"><p>{t("recipes.refreshError")}</p><Button type="button" variant="outline" className="h-11" onClick={() => void query.refetch()}>{t("common.retry")}</Button></div>}
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
      {cookId && cooking.isError && <div role="alert" className="py-2"><p>{t("recipes.loadCookError")}</p><Button type="button" className="h-11" onClick={() => void cooking.refetch()}>{t("common.retry")}</Button></div>}
    </div>
  );
}
