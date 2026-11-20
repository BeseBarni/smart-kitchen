import Image from "next/image";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { Recipe } from "../types";

export function RecipeCardImage({ recipe }: { recipe: Recipe }): React.JSX.Element {
  return (
    <div className="relative h-44 overflow-hidden bg-muted">
      {recipe.imageUrl ? <Image src={recipe.imageUrl} alt={recipe.title} fill unoptimized sizes="(max-width: 430px) 100vw, 430px" className="object-cover" /> : <div className="h-full bg-gradient-to-br from-secondary to-muted" aria-hidden="true" />}
      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-label-sm text-primary-pressed shadow-sm">
        <Sparkles size={14} aria-hidden="true" />{recipe.source === "ai_skill" ? "AI suggested" : "Saved recipe"}
      </span>
      {recipe.isFreezerFriendly && <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-md bg-foreground/90 px-2 py-1 text-label-sm text-background"><CheckCircle2 size={14} aria-hidden="true" /> Freezer friendly</span>}
    </div>
  );
}
