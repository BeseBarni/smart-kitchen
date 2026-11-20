"use client";

import { useState } from "react";
import { ArrowRight, Soup } from "lucide-react";
import Image from "next/image";
import type { UiDirective } from "../types";
import { useChatRecipeActions } from "../hooks/use-chat-recipe-actions";
import { ChatRecipeActions } from "./ChatRecipeActions";
import { ChatRecipeSheet } from "./ChatRecipeSheet";

type Props = Extract<UiDirective, { component: "recipe_preview_card" }> & { assistantResponse: string };

export function RecipeSuggestionCard(props: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const actions = useChatRecipeActions(props);
  return (
    <article className="space-y-2">
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-primary/30 bg-card p-2.5 text-left shadow-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-secondary-foreground">
          {props.recipe.imageUrl ? <Image src={props.recipe.imageUrl} alt="" fill unoptimized sizes="64px" className="object-cover" /> : <Soup size={32} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-label-sm font-semibold uppercase text-primary">{props.status === "saved" ? "Saved recipe" : "Recipe draft"}</span>
          <span className="block truncate text-title-sm">{props.recipe.title}</span>
          <span className="flex items-center gap-1 text-label-md text-primary">View recipe and macros <ArrowRight size={14} aria-hidden="true" /></span>
        </span>
      </button>
      <ChatRecipeActions actions={actions} />
      {open && <ChatRecipeSheet {...props} actions={actions} onClose={() => setOpen(false)} />}
    </article>
  );
}
