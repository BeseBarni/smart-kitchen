"use client";

import type { SharedRecipePublicDto } from "@app/modules/schemas";
import { SharedRecipeTopBar } from "./SharedRecipeTopBar";
import { SharedRecipeHero } from "./SharedRecipeHero";
import { SharedRecipeMacrosCard } from "./SharedRecipeMacrosCard";
import { SharedRecipeIngredientsCard } from "./SharedRecipeIngredientsCard";
import { SharedRecipeInstructionsCard } from "./SharedRecipeInstructionsCard";
import { RecipeAssistantResponse } from "../RecipeAssistantResponse";

export function SharedRecipeFullView({ recipe }: {
  recipe: SharedRecipePublicDto;
}): React.JSX.Element {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-10">
      <SharedRecipeTopBar />
      <article className="space-y-6 py-5">
        <SharedRecipeHero recipe={recipe} />
        <SharedRecipeMacrosCard recipe={recipe} />
        <SharedRecipeIngredientsCard recipe={recipe} />
        <SharedRecipeInstructionsCard recipe={recipe} />
        <RecipeAssistantResponse response={recipe.assistantResponse} />
      </article>
    </div>
  );
}
