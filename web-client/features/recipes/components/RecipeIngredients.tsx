import { Badge } from "@/components/ui/badge";

export function RecipeIngredients({ ingredients }: { ingredients: readonly string[] }): React.JSX.Element {
  return (
    <ul aria-label="Ingredients" className="flex flex-wrap gap-1">
      {ingredients.map((ingredient) => <li key={ingredient}><Badge variant="outline" className="h-auto bg-muted px-2 py-1 text-label-sm text-muted-foreground">{ingredient}</Badge></li>)}
    </ul>
  );
}
