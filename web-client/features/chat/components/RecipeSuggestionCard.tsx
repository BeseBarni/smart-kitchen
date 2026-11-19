import { BookmarkPlus, Clock3, PencilLine, Soup, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RecipeSuggestion } from "../types";

export function RecipeSuggestionCard({ recipe }: { recipe: RecipeSuggestion }): React.JSX.Element {
  return (
    <Card className="gap-0 rounded-2xl border border-border py-0 shadow-[0_1px_3px_rgba(17,24,39,0.04)] ring-0">
      <div className="relative flex h-44 items-center justify-center bg-secondary text-secondary-foreground">
        <Soup size={64} strokeWidth={1} role="img" aria-label="Recipe illustration" />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Badge className="bg-card text-foreground"><Clock3 />{recipe.prepMinutes} min prep</Badge>
          <Badge className="bg-card text-foreground"><UsersRound />{recipe.portions} portions</Badge>
        </div>
        <Badge className="absolute bottom-2.5 left-2.5 bg-primary text-primary-foreground">Example recipe</Badge>
      </div>
      <div className="space-y-2 p-3.5">
        <div>
          <h3 className="text-headline-md">{recipe.title}</h3>
          <p className="mt-0.5 text-body-sm text-muted-foreground">{recipe.description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {recipe.ingredients.map((ingredient) => <Badge key={ingredient} variant="outline" className="h-auto rounded-lg bg-muted px-2.5 py-1 text-label-sm text-muted-foreground">{ingredient}</Badge>)}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1.5">
          <Button disabled className="h-11 rounded-xl"><BookmarkPlus />Save Recipe</Button>
          <Button disabled variant="secondary" className="h-11 rounded-xl"><PencilLine />Edit Details</Button>
        </div>
      </div>
    </Card>
  );
}
