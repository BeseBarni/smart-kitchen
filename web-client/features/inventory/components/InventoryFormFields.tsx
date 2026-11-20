import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { InventoryInput, Storage } from "../types";
import { addDays, addMonths, todayLocal } from "../utils/inventory-formatters";
import { expiryAtEndOfDay, expiryDateValue } from "../utils/inventory-form.mapper";
import { PortionStepper } from "./PortionStepper";

export function InventoryFormFields({ form, disabled }: { form: UseFormReturn<InventoryInput>; disabled: boolean }): React.JSX.Element {
  const { register, watch, setValue, formState: { errors } } = form;
  const storage = watch("storageLocation");
  const portions = watch("remainingQuantity");
  const expiresAt = watch("expiresAt");
  const presets = [
    { label: "+3 days", date: () => addDays(todayLocal(), 3) },
    { label: "+5 days", date: () => addDays(todayLocal(), 5) },
    { label: "+2 weeks", date: () => addDays(todayLocal(), 14) },
    { label: "+3 months", date: () => addMonths(todayLocal(), 3) },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="item-name" className="text-label-md">Item name *</label>
        <Input id="item-name" {...register("name")} disabled={disabled} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder="What did you cook?" className="h-12 bg-card" />
        {errors.name && <p id="name-error" role="alert" className="text-body-sm text-destructive">{errors.name.message}</p>}
      </div>
      <fieldset disabled={disabled} className="space-y-1.5">
        <legend className="text-label-md">Storage location</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {(["fridge", "freezer", "pantry"] as Storage[]).map((value) => <button key={value} type="button" aria-pressed={storage === value} onClick={() => setValue("storageLocation", value, { shouldValidate: true })} className={`min-h-11 rounded-lg text-title-sm focus-visible:outline-2 focus-visible:outline-ring ${storage === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{value[0]?.toUpperCase()}{value.slice(1)}</button>)}
        </div>
      </fieldset>
      <div className="flex items-center justify-between rounded-xl bg-muted p-3">
        <div><p className="text-title-sm">Portions stocked</p><p className="text-body-sm text-muted-foreground">Individual meal containers</p></div>
        <PortionStepper name="new item" portions={portions} disabled={disabled} onAdjust={(delta) => {
          const next = Math.max(1, portions + delta);
          setValue("initialQuantity", next, { shouldValidate: true });
          setValue("remainingQuantity", next, { shouldValidate: true });
        }} />
      </div>
      {errors.remainingQuantity && <p role="alert" className="text-body-sm text-destructive">{errors.remainingQuantity.message}</p>}
      <div className="space-y-1.5">
        <label htmlFor="best-before" className="text-label-md">Freshness &amp; best before</label>
        <Input id="best-before" type="date" value={expiryDateValue(expiresAt)} onChange={(event) => {
          const value = event.target.value;
          setValue("expiresAt", value ? expiryAtEndOfDay(value) : null, { shouldValidate: true });
        }} disabled={disabled} aria-invalid={!!errors.expiresAt} aria-describedby={errors.expiresAt ? "date-error" : undefined} className="h-12 bg-card" />
        {errors.expiresAt && <p id="date-error" role="alert" className="text-body-sm text-destructive">{errors.expiresAt.message}</p>}
        <div className="hide-scrollbar flex gap-1 overflow-x-auto">
          {presets.map((preset) => <button key={preset.label} type="button" disabled={disabled} onClick={() => setValue("expiresAt", expiryAtEndOfDay(preset.date()), { shouldValidate: true })} className="min-h-11 whitespace-nowrap px-2 text-label-md text-primary focus-visible:outline-2 focus-visible:outline-ring">{preset.label}</button>)}
        </div>
      </div>
    </div>
  );
}
