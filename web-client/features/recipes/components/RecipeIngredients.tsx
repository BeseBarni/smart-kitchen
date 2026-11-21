import { Badge } from "@/components/ui/badge";
import { useText } from "@/lib/i18n";

export function RecipeIngredients({ ingredients }: { ingredients: readonly string[] }): React.JSX.Element {
  const { t } = useText();
  return (
    <ul aria-label={t("recipes.ingredients")} className="flex flex-wrap gap-1">
      {ingredients.map((ingredient) => <li key={ingredient}><Badge variant="outline" className="h-auto bg-muted px-2 py-1 text-label-sm text-foreground">{ingredient}</Badge></li>)}
    </ul>
  );
}
