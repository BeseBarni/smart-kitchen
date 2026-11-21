"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { shoppingItemInputSchema, type ShoppingItemInput, type ShoppingSuggestion } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { shoppingApi } from "../api/shopping.api";
import { getText, useText } from "@/lib/i18n";

function ReviewForm({ suggestions, onDone }: { suggestions: ShoppingSuggestion[]; onDone: () => void }): React.JSX.Element {
  const { t, formatNumber } = useText();
  const client = useQueryClient();
  const [values, setValues] = useState(() => suggestions.map((item) => ({
    selected: item.missingQuantity > 0,
    quantity: String(item.missingQuantity > 0 ? item.missingQuantity : Math.ceil(item.quantity * 1000) / 1000),
  })));
  const add = useMutation({
    mutationFn: shoppingApi.add,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["shopping"] });
      toast.success(getText("shopping.added"));
      onDone();
    },
  });
  const selected = suggestions.flatMap((item, index) => {
    const value = values[index];
    return value?.selected ? [{ name: item.name, unit: item.unit, quantity: Number(value.quantity) }] : [];
  });
  const valid = selected.length > 0 && selected.every((item) => shoppingItemInputSchema.safeParse(item).success);
  return (
    <div className="space-y-3">
      <p className="text-body-sm text-muted-foreground">{t("shopping.review")}</p>
      {suggestions.map((item, index) => {
        const value = values[index];
        if (!value) return null;
        return (
          <div key={index} className="space-y-1 rounded-xl bg-muted p-3">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={value.selected} onChange={(event) => setValues((current) => current.map((entry, i) => i === index ? { ...entry, selected: event.target.checked } : entry))} />
              <span className="flex-1">{item.name} ({item.unit})</span>
              <input aria-label={t("shopping.quantity", { name: item.name })} type="number" min="0.001" step="0.001" value={value.quantity} onChange={(event) => setValues((current) => current.map((entry, i) => i === index ? { ...entry, quantity: event.target.value } : entry))} className="h-11 w-24 rounded-md border bg-card px-2" />
            </label>
            <p className="text-label-md text-muted-foreground">{item.missingQuantity === 0 ? t("shopping.available") : t("shopping.missing", { count: formatNumber(item.missingQuantity), unit: item.unit })}</p>
            {item.uncertainMatches.length > 0 && <p className="text-label-md text-amber-700">{t("shopping.matches", { names: item.uncertainMatches.join(", ") })}</p>}
          </div>
        );
      })}
      <Button type="button" className="h-11 w-full" disabled={!valid || add.isPending} onClick={() => add.mutate(selected)}>{t(add.isPending ? "shopping.adding" : "shopping.addSelected")}</Button>
      {add.isError && <p role="alert" className="text-destructive">{t("shopping.addError")}</p>}
    </div>
  );
}

export function ShoppingReview({ items, onDone }: { items: ShoppingItemInput[]; onDone: () => void }): React.JSX.Element {
  const { t } = useText();
  const query = useQuery({
    queryKey: ["shopping", "compare", items],
    queryFn: () => shoppingApi.compare(items),
    retry: false,
  });
  if (query.isPending) return <p role="status">{t("shopping.checking")}</p>;
  if (query.isError) return <div role="alert"><p>{t("shopping.checkError")}</p><Button type="button" variant="outline" className="h-11" onClick={() => void query.refetch()}>{t("common.retry")}</Button></div>;
  return <ReviewForm suggestions={query.data} onDone={onDone} />;
}
