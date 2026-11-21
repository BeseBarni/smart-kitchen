import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { InventoryInput, Storage } from "../types";
import { addDays, addMonths, todayLocal } from "../utils/inventory-formatters";
import { expiryAtEndOfDay, expiryDateValue } from "../utils/inventory-form.mapper";
import { PortionStepper } from "./PortionStepper";
import { useText } from "@/lib/i18n";

export function InventoryFormFields({ form, disabled }: { form: UseFormReturn<InventoryInput>; disabled: boolean }): React.JSX.Element {
  const { t } = useText();
  const { register, watch, setValue, formState: { errors } } = form;
  const storage = watch("storageLocation");
  const portions = watch("remainingQuantity");
  const expiresAt = watch("expiresAt");
  const presets = [
    { label: t("inventory.daysPreset", { count: 3 }), date: () => addDays(todayLocal(), 3) },
    { label: t("inventory.daysPreset", { count: 5 }), date: () => addDays(todayLocal(), 5) },
    { label: t("inventory.weeksPreset", { count: 2 }), date: () => addDays(todayLocal(), 14) },
    { label: t("inventory.monthsPreset", { count: 3 }), date: () => addMonths(todayLocal(), 3) },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="item-name" className="text-label-md">{t("inventory.itemName")}</label>
        <Input id="item-name" {...register("name")} disabled={disabled} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder={t("inventory.namePlaceholder")} className="h-12 bg-card" />
        {errors.name && <p id="name-error" role="alert" className="text-body-sm text-destructive">{t("inventory.invalidField")}</p>}
      </div>
      <fieldset disabled={disabled} className="space-y-1.5">
        <legend className="text-label-md">{t("inventory.location")}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {(["fridge", "freezer", "pantry"] as Storage[]).map((value) => <button key={value} type="button" aria-pressed={storage === value} onClick={() => setValue("storageLocation", value, { shouldValidate: true })} className={`min-h-11 rounded-lg text-title-sm focus-visible:outline-2 focus-visible:outline-ring ${storage === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t(`inventory.${value}`)}</button>)}
        </div>
      </fieldset>
      <div className="flex items-center justify-between rounded-xl bg-muted p-3">
        <div><p className="text-title-sm">{t("inventory.stocked")}</p><p className="text-body-sm text-muted-foreground">{t("inventory.containers")}</p></div>
        <PortionStepper name={t("inventory.newItem")} portions={portions} disabled={disabled} onAdjust={(delta) => {
          const next = Math.max(1, portions + delta);
          setValue("initialQuantity", next, { shouldValidate: true });
          setValue("remainingQuantity", next, { shouldValidate: true });
        }} />
      </div>
      {errors.remainingQuantity && <p role="alert" className="text-body-sm text-destructive">{t("inventory.invalidField")}</p>}
      <label className="block space-y-1.5 text-label-md">{t("inventory.fiber")} {watch("itemType") === "meal_prep" ? "*" : ""}
        <Input type="number" min="0" step="0.01" className="h-12 bg-card" disabled={disabled} {...register("fiberPerUnit", { setValueAs: (value: string) => value === "" ? null : Number(value) })} />
      </label>
      {errors.fiberPerUnit && <p role="alert" className="text-body-sm text-destructive">{t(errors.fiberPerUnit.type === "required" ? "inventory.fiberRequired" : "inventory.invalidField")}</p>}
      <div className="space-y-1.5">
        <label htmlFor="best-before" className="text-label-md">{t("inventory.freshness")}</label>
        <Input id="best-before" type="date" value={expiryDateValue(expiresAt)} onChange={(event) => {
          const value = event.target.value;
          setValue("expiresAt", value ? expiryAtEndOfDay(value) : null, { shouldValidate: true });
        }} disabled={disabled} aria-invalid={!!errors.expiresAt} aria-describedby={errors.expiresAt ? "date-error" : undefined} className="h-12 bg-card" />
        {errors.expiresAt && <p id="date-error" role="alert" className="text-body-sm text-destructive">{t("inventory.invalidField")}</p>}
        <div className="hide-scrollbar flex gap-1 overflow-x-auto">
          {presets.map((preset) => <button key={preset.label} type="button" disabled={disabled} onClick={() => setValue("expiresAt", expiryAtEndOfDay(preset.date()), { shouldValidate: true })} className="min-h-11 whitespace-nowrap px-2 text-label-md text-primary focus-visible:outline-2 focus-visible:outline-ring">{preset.label}</button>)}
        </div>
      </div>
    </div>
  );
}
