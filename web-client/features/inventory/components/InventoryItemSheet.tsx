"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { InventoryInput, InventoryItem } from "../types";
import { inventoryFormSchema } from "../utils/inventory-form.schema";
import { addDays, todayLocal } from "../utils/inventory-formatters";
import { InventoryFormFields } from "./InventoryFormFields";

interface Props {
  item?: InventoryItem;
  busy: boolean;
  onClose: () => void;
  onSave: (input: InventoryInput) => Promise<void>;
}

export function InventoryItemSheet({ item, busy, onClose, onSave }: Props): React.JSX.Element {
  const form = useForm<InventoryInput>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: item ?? { name: "", storage: "fridge", portions: 1, bestBefore: addDays(todayLocal(), 3), container: "glass", location: "" },
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      await onSave(input);
      onClose();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Could not save this item." });
    }
  });
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] w-full max-w-[430px] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-start justify-between px-4 pt-5">
          <div><SheetTitle className="text-headline-md">{item ? "Edit Meal Prep Item" : "Add Meal Prep Item"}</SheetTitle>
            <SheetDescription className="mt-1 text-body-sm">Log a cooked batch or leftovers in your demo inventory.</SheetDescription></div>
          <SheetClose render={<Button type="button" variant="ghost" className="size-11 shrink-0" disabled={busy} />}><X size={18} /><span className="sr-only">Close</span></SheetClose>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 px-4 pb-5 pt-4">
          <InventoryFormFields form={form} disabled={busy} />
          {form.formState.errors.root && <p role="alert" className="text-body-sm text-destructive">{form.formState.errors.root.message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-title-sm">{busy ? "Saving..." : item ? "Save changes" : "Save to Inventory"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
