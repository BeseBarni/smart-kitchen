"use client";

import { useState } from "react";
import { ArrowRight, Soup } from "lucide-react";
import type { UiDirective } from "../types";
import { useChatRecipeActions } from "../hooks/use-chat-recipe-actions";
import { ChatRecipeActions } from "./ChatRecipeActions";
import { ChatRecipeSheet } from "./ChatRecipeSheet";
import { useText } from "@/lib/i18n";
import { ResolvedEntityImage } from "@/components/media/ResolvedEntityImage";

type Props = Extract<UiDirective, { component: "recipe_preview_card" }> & { assistantResponse: string; streaming: boolean };

export function RecipeSuggestionCard(props: Props): React.JSX.Element {
  const { t } = useText();
  const [open, setOpen] = useState(false);
  const actions = useChatRecipeActions(props);
  return (
    <article className="space-y-2">
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-primary/30 bg-card p-2.5 text-left shadow-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-secondary-foreground">
          <ResolvedEntityImage
            entity={{
              stockImageKind: props.recipe.stockImageKind,
              stockImageName: props.recipe.stockImageName,
              imageUrl: props.recipe.imageUrl,
            }}
            alt=""
            size="small"
            fallback={<Soup size={32} aria-hidden="true" />}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-label-sm font-semibold uppercase text-primary">{t(props.status === "saved" ? "recipes.savedRecipe" : "chat.draft")}</span>
          <span className="block truncate text-title-sm">{props.recipe.title}</span>
          <span className="flex items-center gap-1 text-label-md text-primary">{t("chat.viewRecipe")} <ArrowRight size={14} aria-hidden="true" /></span>
        </span>
      </button>
      <ChatRecipeActions actions={actions} />
      {props.status === "draft" && props.recipe.fiberPerServing == null && <p className="text-body-sm text-muted-foreground">{t("chat.missingFiber")}</p>}
      {open && <ChatRecipeSheet {...props} actions={actions} onClose={() => setOpen(false)} />}
    </article>
  );
}
