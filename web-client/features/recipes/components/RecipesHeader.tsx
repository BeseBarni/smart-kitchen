import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RecipesHeaderProps {
  total: number;
  favorites: number;
  search: string;
  onSearch: (value: string) => void;
}

export function RecipesHeader({ total, favorites, search, onSearch }: RecipesHeaderProps): React.JSX.Element {
  return (
    <header className="space-y-3 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-lg-mobile">Recipes</h1>
          <p className="text-label-md text-muted-foreground">
            {total} cataloged · {favorites} {favorites === 1 ? "favorite" : "favorites"}
          </p>
        </div>
        <Button type="button" disabled title="Creating recipes is unavailable in this demo" aria-label="New recipe unavailable in this demo" className="min-h-11">
          <Plus aria-hidden="true" /> New
        </Button>
      </div>
      <div className="relative">
        <Search aria-hidden="true" size={20} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" />
        <Input type="search" aria-label="Search recipes" placeholder="Search ingredients, tags, or dishes..." value={search}
          onChange={(event) => onSearch(event.target.value)} className="h-11 rounded-xl bg-card pl-10 text-body-md" />
      </div>
    </header>
  );
}
