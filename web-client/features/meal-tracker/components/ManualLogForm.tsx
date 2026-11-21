"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createMealLogSchema, type ProfileDto } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDate } from "../utils/date.utils";
import { useMealLogMutations } from "../hooks/use-meal-log-mutations";
import { useText, type TranslationKey } from "@/lib/i18n";

const formSchema = createMealLogSchema.pick({
  name: true, mealType: true, quantity: true, unit: true, calories: true,
  proteinG: true, carbsG: true, fatG: true, costAmount: true,
}).extend({
  fiberG: z.number().nonnegative(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
type Values = z.infer<typeof formSchema>;

export function ManualLogForm({ date, profile, mealType, onClose }: {
  date: string; profile: ProfileDto; mealType: Values["mealType"]; onClose: () => void;
}): React.JSX.Element {
  const { t } = useText();
  const { create } = useMealLogMutations();
  const now = new Date();
  const time = date === localDate(now) ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "12:00";
  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", mealType: mealType ?? "breakfast", quantity: 1, unit: "portion", calories: null, proteinG: null, carbsG: null, fatG: null, fiberG: undefined, costAmount: null, time },
  });
  const submit = form.handleSubmit(async ({ time: selectedTime, ...values }) => {
    const eaten = new Date(`${date}T${selectedTime}:00`);
    if (Number.isNaN(eaten.getTime()) || localDate(eaten) !== date || `${String(eaten.getHours()).padStart(2, "0")}:${String(eaten.getMinutes()).padStart(2, "0")}` !== selectedTime) {
      form.setError("time", { type: "validate" }); return;
    }
    try {
      await create.mutateAsync({ ...values, inventoryItemId: null, recipeId: null, currency: profile.currency, eatenAt: eaten.toISOString() });
      onClose();
    } catch { /* Mutation reports the error and keeps the form open. */ }
  });
  const optionalNumber = (value: string): number | null => value === "" ? null : Number(value);
  return <form onSubmit={(event) => void submit(event)} className="space-y-3">
    <label className="block text-label-md">{t("mealTracker.mealName")}<Input className="h-11" {...form.register("name")} /></label>
    <label className="block text-label-md">{t("mealTracker.mealType")}<select className="h-11 w-full rounded-md border bg-background px-2" {...form.register("mealType")}>{(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => <option key={type} value={type}>{t(`mealTracker.${type}`)}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2">
      <label className="text-label-md">{t("mealTracker.quantity")}<Input type="number" step="0.01" className="h-11" {...form.register("quantity", { valueAsNumber: true })} /></label>
      <label className="text-label-md">{t("mealTracker.unit")}<Input className="h-11" {...form.register("unit")} /></label>
      {([["calories", "mealTracker.caloriesLabel"], ["proteinG", "mealTracker.proteinLabel"], ["carbsG", "mealTracker.carbsLabel"], ["fatG", "mealTracker.fatLabel"], ["costAmount", "mealTracker.cost"]] as const satisfies readonly (readonly [keyof Values, TranslationKey])[]).map(([field, label]) => <label key={field} className="text-label-md">{t(label, { currency: profile.currency })}<Input type="number" min="0" step="0.01" className="h-11" {...form.register(field, { setValueAs: optionalNumber })} /></label>)}
      <label className="text-label-md">{t("mealTracker.fiberLabel")} *<Input type="number" min="0" step="0.01" className="h-11" {...form.register("fiberG", { valueAsNumber: true })} /></label>
      <label className="text-label-md">{t("mealTracker.eatenAt")}<Input type="time" className="h-11" {...form.register("time")} /></label>
    </div>
    {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive text-body-sm">{t("mealTracker.checkFields")}</p>}
    <Button className="h-12 w-full" disabled={create.isPending}>{t("mealTracker.log")}</Button>
  </form>;
}
