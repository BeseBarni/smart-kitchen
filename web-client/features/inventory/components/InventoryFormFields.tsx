import { Sparkles } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { Container, InventoryInput, Storage } from "../types";
import { addDays, addMonths, todayLocal } from "../utils/inventory-formatters";
import { PortionStepper } from "./PortionStepper";

export function InventoryFormFields({ form, disabled }: { form: UseFormReturn<InventoryInput>; disabled: boolean }): React.JSX.Element {
  const { register, watch, setValue, formState: { errors } } = form;
  const storage = watch("storage");
  const portions = watch("portions");
  const container = watch("container");
  const presets = [
    { label: "+3 days", date: () => addDays(todayLocal(), 3) },
    { label: "+5 days", date: () => addDays(todayLocal(), 5) },
    { label: "+2 weeks", date: () => addDays(todayLocal(), 14) },
    { label: "+3 months", date: () => addMonths(todayLocal(), 3) },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><label htmlFor="item-name" className="text-label-md">Item name *</label>
          <button type="button" disabled title="AI Autofill is unavailable in this demo" className="flex min-h-11 items-center gap-1 text-label-sm text-muted-foreground opacity-60"><Sparkles size={14} /> AI Autofill</button>
        </div>
        <Input id="item-name" {...register("name")} disabled={disabled} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder="What did you cook?" className="h-12 bg-card" />
        {errors.name && <p id="name-error" role="alert" className="text-body-sm text-destructive">{errors.name.message}</p>}
      </div>
      <fieldset disabled={disabled} className="space-y-1.5">
        <legend className="text-label-md">Storage location</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["fridge", "freezer"] as Storage[]).map((value) => <button key={value} type="button" aria-pressed={storage === value} onClick={() => setValue("storage", value)} className={`min-h-11 rounded-lg text-title-sm focus-visible:outline-2 focus-visible:outline-ring ${storage === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{value === "fridge" ? "Fridge" : "Freezer"}</button>)}
        </div>
      </fieldset>
      <div className="flex items-center justify-between rounded-xl bg-muted p-3">
        <div><p className="text-title-sm">Portions stocked</p><p className="text-body-sm text-muted-foreground">Individual meal containers</p></div>
        <PortionStepper name="new item" portions={portions} disabled={disabled} onAdjust={(delta) => setValue("portions", Math.max(1, portions + delta), { shouldValidate: true })} />
      </div>
      {errors.portions && <p role="alert" className="text-body-sm text-destructive">{errors.portions.message}</p>}
      <div className="space-y-1.5">
        <label htmlFor="best-before" className="text-label-md">Freshness &amp; best before</label>
        <Input id="best-before" type="date" {...register("bestBefore")} disabled={disabled} aria-invalid={!!errors.bestBefore} aria-describedby={errors.bestBefore ? "date-error" : undefined} className="h-12 bg-card" />
        {errors.bestBefore && <p id="date-error" role="alert" className="text-body-sm text-destructive">{errors.bestBefore.message}</p>}
        <div className="hide-scrollbar flex gap-1 overflow-x-auto">
          {presets.map((preset) => <button key={preset.label} type="button" disabled={disabled} onClick={() => setValue("bestBefore", preset.date(), { shouldValidate: true })} className="min-h-11 whitespace-nowrap px-2 text-label-md text-primary focus-visible:outline-2 focus-visible:outline-ring">{preset.label}</button>)}
        </div>
      </div>
      <fieldset disabled={disabled} className="space-y-1.5">
        <legend className="text-label-md">Container type</legend>
        <div className="grid grid-cols-3 gap-1">
          {([["glass", "Pyrex Glass"], ["bag", "Vacuum Bag"], ["box", "Meal Box"]] as [Container, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={container === value} onClick={() => setValue("container", value)} className={`min-h-11 rounded-xl px-1 text-label-sm focus-visible:outline-2 focus-visible:outline-ring ${container === value ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{label}</button>)}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="item-location" className="text-label-md">Shelf or location (optional)</label>
        <Input id="item-location" {...register("location")} disabled={disabled} aria-invalid={!!errors.location} aria-describedby={errors.location ? "location-error" : undefined} placeholder="e.g. Top shelf" className="h-12 bg-card" />
        {errors.location && <p id="location-error" role="alert" className="text-body-sm text-destructive">{errors.location.message}</p>}
      </div>
    </div>
  );
}
