"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, type ProfileDto } from "@app/modules/schemas";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMealLogMutations } from "../hooks/use-meal-log-mutations";

const target = z.number().int().positive().nullable();
const schema = updateProfileSchema.pick({ dailyCalorieTarget: true, dailyProteinG: true, dailyCarbsG: true, dailyFatG: true, dailyFiberG: true }).extend({
  dailyCalorieTarget: target, dailyProteinG: target, dailyCarbsG: target, dailyFatG: target, dailyFiberG: target,
});
type Values = z.infer<typeof schema>;
const fields = [
  ["dailyCalorieTarget", "Calories (kcal)"], ["dailyProteinG", "Protein (g)"],
  ["dailyCarbsG", "Carbs (g)"], ["dailyFatG", "Fat (g)"], ["dailyFiberG", "Fiber (g)"],
] as const;

export function EditTargetsSheet({ profile, onClose }: { profile: ProfileDto; onClose: () => void }): React.JSX.Element {
  const { targets } = useMealLogMutations();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    dailyCalorieTarget: profile.dailyCalorieTarget, dailyProteinG: profile.dailyProteinG,
    dailyCarbsG: profile.dailyCarbsG, dailyFatG: profile.dailyFatG, dailyFiberG: profile.dailyFiberG,
  } });
  const submit = form.handleSubmit(async (input) => {
    try { await targets.mutateAsync(input); onClose(); }
    catch { /* Mutation reports the error and keeps the form open. */ }
  });
  return <Sheet open onOpenChange={(open) => { if (!open && !targets.isPending) onClose(); }}>
    <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <SheetTitle>Daily targets</SheetTitle><SheetDescription>Leave a target empty if you do not want to set it.</SheetDescription>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        {fields.map(([field, label]) => <label key={field} className="block text-label-md">{label}<Input className="h-11" type="number" min="1" step="1" {...form.register(field, { setValueAs: (value: string) => value === "" ? null : Number(value) })} /></label>)}
        {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-body-sm text-destructive">Targets must be positive whole numbers.</p>}
        <Button className="h-12 w-full" disabled={targets.isPending}>Save targets</Button>
      </form>
    </SheetContent>
  </Sheet>;
}
