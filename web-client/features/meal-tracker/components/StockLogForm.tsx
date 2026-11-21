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

const schema = consumeInventoryInputSchema.extend({
  itemId: z.string().uuid(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
type Values = z.infer<typeof schema>;

export function StockLogForm({ date, mealType, onClose }: {
  date: string; mealType: Values["mealType"] | null; onClose: () => void;
}): React.JSX.Element {
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
      form.setError("itemId", { message: "Select an available stock item." }); return;
    }
    if (input.quantity > selected.remainingQuantity) {
      form.setError("quantity", { message: "Not enough stock." }); return;
    }
    if (selected.fiberPerUnit === null && fiberG === undefined) {
      form.setError("fiberG", { message: "Enter fiber for this meal." }); return;
    }
    const eaten = new Date(`${date}T${selectedTime}:00`);
    if (Number.isNaN(eaten.getTime()) || localDate(eaten) !== date || `${String(eaten.getHours()).padStart(2, "0")}:${String(eaten.getMinutes()).padStart(2, "0")}` !== selectedTime) {
      form.setError("time", { message: "Choose a valid local time." }); return;
    }
    try { await consume.mutateAsync({ id: itemId, input: { ...input, ...(selected.fiberPerUnit === null ? { fiberG } : {}), requireFiber: true, eatenAt: eaten.toISOString() } }); onClose(); }
    catch { /* Mutation reports the error and keeps the form open. */ }
  });
  if (stock.isPending) return <p role="status">Loading stock…</p>;
  if (stock.isError) return <div role="alert">Could not load stock. <Button type="button" onClick={() => void stock.refetch()}>Retry</Button></div>;
  return <form onSubmit={(event) => void submit(event)} className="space-y-3">
    <label className="block text-label-md">Stock item<select className="h-11 w-full rounded-md border bg-background px-2" {...form.register("itemId", { onChange: () => form.resetField("fiberG") })}><option value="">Select an item</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.storageLocation} · {item.remainingQuantity} {item.unit}</option>)}</select></label>
    {stock.hasNextPage && <Button type="button" variant="outline" disabled={stock.isFetchingNextPage} onClick={() => void stock.fetchNextPage()}>Load more stock</Button>}
    {!items.length && <p className="text-body-sm">No stocked items found.</p>}
    <label className="block text-label-md">Quantity {selected ? `(${selected.unit})` : ""}<Input type="number" step="0.5" min="0.01" className="h-11" {...form.register("quantity", { valueAsNumber: true })} /></label>
    <label className="block text-label-md">Meal type<select className="h-11 w-full rounded-md border bg-background px-2" {...form.register("mealType")}>{["breakfast", "lunch", "dinner", "snack"].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
    <label className="block text-label-md">Eaten at<Input type="time" className="h-11" {...form.register("time")} /></label>
    {selected && <div className="text-body-sm tabular-nums">{[["Calories", selected.caloriesPerUnit], ["Protein (g)", selected.proteinPerUnit], ["Carbs (g)", selected.carbsPerUnit], ["Fat (g)", selected.fatPerUnit], ["Fiber (g)", selected.fiberPerUnit], [`Cost (${selected.currency})`, selected.costPerUnit]].map(([label, amount]) => <p key={String(label)}>{label}: {typeof amount === "number" && Number.isFinite(quantity) ? formatAmount(amount * quantity) : "Unknown"}</p>)}</div>}
    {selected?.fiberPerUnit === null && <label className="block text-label-md">Fiber for this meal (g) *<Input type="number" step="0.01" min="0" className="h-11" {...form.register("fiberG", { setValueAs: (value: string) => value === "" ? undefined : Number(value) })} /></label>}
    {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive text-body-sm">Check the item, quantity, time and fiber value.</p>}
    <Button className="h-12 w-full" disabled={consume.isPending || !selected}>Log from stock</Button>
  </form>;
}
