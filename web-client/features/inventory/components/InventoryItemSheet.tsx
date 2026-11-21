"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createInventoryItemSchema } from "@app/modules/schemas";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { InventoryInput, InventoryItem } from "../types";
import { inventoryFormValues } from "../utils/inventory-form.mapper";
import { InventoryFormFields } from "./InventoryFormFields";

interface Props {
  item?: InventoryItem;
  busy: boolean;
  onClose: () => void;
  onSave: (input: InventoryInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function InventoryItemSheet({ item, busy, onClose, onSave, onDelete }: Props): React.JSX.Element {
  const form = useForm<InventoryInput>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: inventoryFormValues(item),
  });
  const submit = form.handleSubmit(async (input) => {
    if (input.itemType === "meal_prep" && (input.fiberPerUnit === null || input.fiberPerUnit === undefined)) {
      form.setError("fiberPerUnit", { message: "Enter fiber per portion." });
      return;
    }
    try {
      await onSave(input);
      onClose();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Could not save this item." });
    }
  });
  const deleteItem = async (): Promise<void> => {
    if (!item || !onDelete) return;
    try {
      await onDelete(item.id);
      onClose();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Could not delete this item." });
    }
  };
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] w-full max-w-[430px] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-start justify-between px-4 pt-5">
          <div><SheetTitle className="text-headline-md">{item ? "Edit Meal Prep Item" : "Add Meal Prep Item"}</SheetTitle>
            <SheetDescription className="mt-1 text-body-sm">Record a batch in your inventory.</SheetDescription></div>
          <SheetClose render={<Button type="button" variant="ghost" className="size-11 shrink-0" disabled={busy} />}><X size={18} /><span className="sr-only">Close</span></SheetClose>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 px-4 pb-5 pt-4">
          <InventoryFormFields form={form} disabled={busy} />
          {form.formState.errors.root && <p role="alert" className="text-body-sm text-destructive">{form.formState.errors.root.message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-title-sm">{busy ? "Saving..." : item ? "Save changes" : "Save to Inventory"}</Button>
          {item && onDelete && <Button type="button" disabled={busy} variant="outline" onClick={() => void deleteItem()} className="h-11 w-full text-destructive">Delete item</Button>}
        </form>
      </SheetContent>
    </Sheet>
  );
}
