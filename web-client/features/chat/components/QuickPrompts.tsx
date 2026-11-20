import { Snowflake, Sparkles, Utensils, Zap, type LucideIcon } from "lucide-react";
import type { QuickPrompt } from "../types";

const icons: Record<QuickPrompt["id"], LucideIcon> = {
  plan: Sparkles, rescue: Snowflake, meal: Utensils, quick: Zap,
};

export function QuickPrompts({ prompts, onSelect }: { prompts: readonly QuickPrompt[]; onSelect: (prompt: QuickPrompt) => void }): React.JSX.Element {
  return (
    <div aria-label="Quick prompts" className="hide-scrollbar pointer-events-auto overflow-x-auto pb-2">
      <div className="flex w-max gap-1">
        {prompts.map((prompt) => {
          const Icon = icons[prompt.id];
          return (
            <button key={prompt.id} type="button" onClick={() => onSelect(prompt)} className="flex min-h-11 items-center">
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-label-sm text-muted-foreground">
                <Icon size={15} aria-hidden="true" />{prompt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
