import { Sparkles } from "lucide-react";
import type { RecipeFilter } from "../types";
import { useText, type TranslationKey } from "@/lib/i18n";

interface RecipesFiltersProps {
  filter: RecipeFilter;
  total: number;
  onChange: (filter: RecipeFilter) => void;
}

const filters: { id: RecipeFilter; label: TranslationKey }[] = [
  { id: "all", label: "inventory.all" },
  { id: "ai-generated", label: "recipes.aiGenerated" },
  { id: "quick", label: "recipes.quick" },
  { id: "freezer-friendly", label: "recipes.freezerFriendly" },
];

export function RecipesFilters({ filter, total, onChange }: RecipesFiltersProps): React.JSX.Element {
  const { t, formatNumber } = useText();
  return (
    <div role="group" aria-label={t("recipes.filter")} className="hide-scrollbar -mx-margin flex gap-1 overflow-x-auto px-margin py-1">
      {filters.map(({ id, label }) => (
        <button key={id} type="button" aria-pressed={filter === id} onClick={() => onChange(id)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3.5 text-label-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${filter === id ? "border-foreground bg-foreground text-background" : id === "ai-generated" ? "border-primary/20 bg-secondary text-secondary-foreground" : "border-border bg-card text-muted-foreground"}`}>
          {id === "ai-generated" && <Sparkles size={15} aria-hidden="true" />}
          {t(label)}{id === "all" ? ` (${formatNumber(total)})` : ""}
        </button>
      ))}
    </div>
  );
}
