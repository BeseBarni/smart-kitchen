"use client";

import Image from "next/image";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useText } from "@/lib/i18n";
import { useMealDbImageSearch, type MealDbCandidate } from "../hooks/use-mealdb-image-search";

type Props = {
  kind: "meal" | "ingredient";
  onSelect: (candidate: MealDbCandidate) => void;
};

export function StockImageSearchGrid({ kind, onSelect }: Props): React.JSX.Element {
  const { t } = useText();
  const [query, setQuery] = useState("");
  const { candidates, isLoading, error } = useMealDbImageSearch(kind, query);
  return (
    <section className="space-y-3" aria-label={t("common.stockImageSearch")}>
      <label className="relative block">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("common.stockImagePlaceholder")}
          className="h-11 pl-9"
        />
      </label>
      {isLoading && <p className="text-body-sm text-muted-foreground">{t("common.loading")}</p>}
      {error && <p role="alert" className="text-body-sm text-destructive">{t("common.stockImageError")}</p>}
      {!isLoading && !error && query.trim().length >= 2 && candidates.length === 0 &&
        <p className="rounded-lg border border-border bg-muted p-3 text-body-sm text-muted-foreground">{t("common.stockImageEmpty")}</p>}
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((candidate) => (
          <button
            type="button"
            key={`${candidate.stockImageKind}-${candidate.stockImageName}`}
            onClick={() => onSelect(candidate)}
            className="min-h-28 overflow-hidden rounded-xl border border-border bg-card text-left focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="relative block h-20 bg-muted">
              <Image src={candidate.previewUrl} alt="" fill unoptimized sizes="160px" className="object-cover" />
            </span>
            <span className="block truncate px-2 py-2 text-label-md">{candidate.label}</span>
          </button>
        ))}
      </div>
      {candidates.length > 0 && (
        <p className="text-label-sm text-muted-foreground">{t("common.stockImageAttribution")}</p>
      )}
    </section>
  );
}
