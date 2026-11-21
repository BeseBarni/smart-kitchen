import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOCALE_META, useText } from "@/lib/i18n";

interface RecipesHeaderProps {
  total: number;
  search: string;
  onSearch: (value: string) => void;
  onNew: () => void;
}

export function RecipesHeader({ total, search, onSearch, onNew }: RecipesHeaderProps): React.JSX.Element {
  const { t, locale, formatNumber } = useText();
  return (
    <header className="space-y-3 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-lg-mobile">{t("nav.recipes")}</h1>
          <p className="text-label-md text-muted-foreground">{t(new Intl.PluralRules(LOCALE_META[locale].tag).select(total) === "one" ? "recipes.countOne" : "recipes.countOther", { count: formatNumber(total) })}</p>
        </div>
        <Button type="button" onClick={onNew} className="min-h-11">
          <Plus aria-hidden="true" /> {t("recipes.new")}
        </Button>
      </div>
      <div className="relative">
        <Search aria-hidden="true" size={20} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" />
        <Input type="search" aria-label={t("recipes.search")} placeholder={t("recipes.searchPlaceholder")} value={search}
          onChange={(event) => onSearch(event.target.value)} className="h-11 rounded-xl bg-card pl-10 text-body-md" />
      </div>
    </header>
  );
}
