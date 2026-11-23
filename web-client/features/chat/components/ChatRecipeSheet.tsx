"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RecipeAssistantResponse, RecipeDetailModal } from "@/features/recipes";
import { ShoppingReview } from "@/features/shopping";
import type { ChatRecipeActionsState } from "../hooks/use-chat-recipe-actions";
import type { UiDirective } from "../types";
import { ChatRecipeActions } from "./ChatRecipeActions";
import { useText } from "@/lib/i18n";

type Props = Extract<UiDirective, { component: "recipe_preview_card" }> & {
  onClose: () => void;
  assistantResponse: string;
  actions: ChatRecipeActionsState;
};

export function ChatRecipeSheet({ recipe, assistantResponse, actions, onClose }: Props): React.JSX.Element {
  const { t } = useText();
  const [review, setReview] = useState(false);
  return (
    <RecipeDetailModal open onClose={onClose} recipe={recipe} markdown>
      <RecipeAssistantResponse response={assistantResponse} />
      <ChatRecipeActions actions={actions} />
      {recipe.ingredients.length > 0 && (review
        ? <ShoppingReview items={recipe.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit }))} onDone={() => setReview(false)} />
        : <Button type="button" variant="secondary" className="h-11 w-full" onClick={() => setReview(true)}>{t("recipes.addMissing")}</Button>)}
    </RecipeDetailModal>
  );
}
