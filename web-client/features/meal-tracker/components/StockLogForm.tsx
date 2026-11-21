"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { consumeInventoryInputSchema } from "@app/modules/schemas";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMealLogMutations } from "../hooks/use-meal-log-mutations";
import { useStockItems } from "../hooks/use-stock-items";
import { localDate } from "../utils/date.utils";
import { formatAmount } from "../utils/nutrition.utils";
import { useText } from "@/lib/i18n";

const schema = consumeInventoryInputSchema.extend({
  itemId: z.string().uuid(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
type Values = z.infer<typeof schema>;

export function StockLogForm({ date, mealType, onClose }: {
  date: string; mealType: Values["mealType"] | null; onClose: () => void;
}): React.JSX.Element {
  const { t, locale } = useText();
  const stock = useStockItems();
  const { consume } = useMealLogMutations();
  const now = new Date();
  const time = date === localDate(now) ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "12:00";
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { itemId: "", quantity: 1, mealType: mealType ?? "breakfast", time } });
  const items = stock.data?.pages.flat() ?? [];
  const itemId = useWatch({ control: form.control, name: "itemId" });
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const selected = items.find((item) => item.id === itemId);
  const submit = form.handleSubmit(async ({ itemId, time: selectedTime, fiberG, ...input }) => {
    if (!selected) {
      form.setError("itemId", { type: "validate" }); return;
    }
    if (input.quantity > selected.remainingQuantity) {
      form.setError("quantity", { type: "validate" }); return;
    }
    if (selected.fiberPerUnit === null && fiberG === undefined) {
      form.setError("fiberG", { type: "validate" }); return;
    }
    const eaten = new Date(`${date}T${selectedTime}:00`);
    if (Number.isNaN(eaten.getTime()) || localDate(eaten) !== date || `${String(eaten.getHours()).padStart(2, "0")}:${String(eaten.getMinutes()).padStart(2, "0")}` !== selectedTime) {
      form.setError("time", { type: "validate" }); return;
    }
    consume.mutate({ id: itemId, input: { ...input, ...(selected.fiberPerUnit === null ? { fiberG } : {}), requireFiber: true, eatenAt: eaten.toISOString() } });
    onClose();
  });
  if (stock.isPending) return <p role="status">{t("mealTracker.loadingStock")}</p>;
  if (stock.isError) return <div role="alert">{t("mealTracker.loadStockError")} <Button type="button" onClick={() => void stock.refetch()}>{t("common.retry")}</Button></div>;
  return <form onSubmit={(event) => void submit(event)} className="space-y-3">
    <label className="block text-label-md">{t("mealTracker.stockItem")}<select className="h-11 w-full rounded-md border bg-background px-2" {...form.register("itemId", { onChange: () => form.resetField("fiberG") })}><option value="">{t("mealTracker.selectItem")}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} · {t(`inventory.${item.storageLocation}`)} · {formatAmount(item.remainingQuantity, locale)} {item.unit}</option>)}</select></label>
    {stock.hasNextPage && <Button type="button" variant="outline" disabled={stock.isFetchingNextPage} onClick={() => void stock.fetchNextPage()}>{t("mealTracker.loadMore")}</Button>}
    {!items.length && <p className="text-body-sm">{t("mealTracker.noStock")}</p>}
    <label className="block text-label-md">{t("mealTracker.quantity")} {selected ? `(${selected.unit})` : ""}<Input type="number" step="0.5" min="0.01" className="h-11" {...form.register("quantity", { valueAsNumber: true })} /></label>
    <label className="block text-label-md">{t("mealTracker.mealType")}<select className="h-11 w-full rounded-md border bg-background px-2" {...form.register("mealType")}>{(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => <option key={type} value={type}>{t(`mealTracker.${type}`)}</option>)}</select></label>
    <label className="block text-label-md">{t("mealTracker.eatenAt")}<Input type="time" className="h-11" {...form.register("time")} /></label>
    {selected && <div className="text-body-sm tabular-nums">{[[t("mealTracker.caloriesLabel"), selected.caloriesPerUnit], [t("mealTracker.proteinLabel"), selected.proteinPerUnit], [t("mealTracker.carbsLabel"), selected.carbsPerUnit], [t("mealTracker.fatLabel"), selected.fatPerUnit], [t("mealTracker.fiberLabel"), selected.fiberPerUnit], [t("mealTracker.cost", { currency: selected.currency }), selected.costPerUnit]].map(([label, amount]) => <p key={String(label)}>{label}: {typeof amount === "number" && Number.isFinite(quantity) ? formatAmount(amount * quantity, locale) : t("mealTracker.unknown")}</p>)}</div>}
    {selected?.fiberPerUnit === null && <label className="block text-label-md">{t("mealTracker.fiberForMeal")}<Input type="number" step="0.01" min="0" className="h-11" {...form.register("fiberG", { setValueAs: (value: string) => value === "" ? undefined : Number(value) })} /></label>}
    {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive text-body-sm">{t("mealTracker.checkStock")}</p>}
    <Button className="h-12 w-full" disabled={consume.isPending || !selected}>{t("mealTracker.logStock")}</Button>
  </form>;
}
