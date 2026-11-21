"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createMealLogSchema, type ProfileDto } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDate } from "../utils/date.utils";
import { useMealLogMutations } from "../hooks/use-meal-log-mutations";

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
      form.setError("time", { message: "Choose a valid local time." }); return;
    }
    try {
      await create.mutateAsync({ ...values, inventoryItemId: null, recipeId: null, currency: profile.currency, eatenAt: eaten.toISOString() });
      onClose();
    } catch { /* Mutation reports the error and keeps the form open. */ }
  });
  const optionalNumber = (value: string): number | null => value === "" ? null : Number(value);
  return <form onSubmit={(event) => void submit(event)} className="space-y-3">
    <label className="block text-label-md">Meal name<Input className="h-11" {...form.register("name")} /></label>
    <label className="block text-label-md">Meal type<select className="h-11 w-full rounded-md border bg-background px-2" {...form.register("mealType")}>{["breakfast", "lunch", "dinner", "snack"].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2">
      <label className="text-label-md">Quantity<Input type="number" step="0.01" className="h-11" {...form.register("quantity", { valueAsNumber: true })} /></label>
      <label className="text-label-md">Unit<Input className="h-11" {...form.register("unit")} /></label>
      {(["calories", "proteinG", "carbsG", "fatG", "costAmount"] as const).map((field) => <label key={field} className="text-label-md">{field}<Input type="number" min="0" step="0.01" className="h-11" {...form.register(field, { setValueAs: optionalNumber })} /></label>)}
      <label className="text-label-md">Fiber (g) *<Input type="number" min="0" step="0.01" className="h-11" {...form.register("fiberG", { valueAsNumber: true })} /></label>
      <label className="text-label-md">Eaten at<Input type="time" className="h-11" {...form.register("time")} /></label>
    </div>
    {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive text-body-sm">Check the required fields and enter valid values.</p>}
    <Button className="h-12 w-full" disabled={create.isPending}>Log meal</Button>
  </form>;
}
