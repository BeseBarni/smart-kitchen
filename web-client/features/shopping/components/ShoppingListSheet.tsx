"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { shoppingApi } from "../api/shopping.api";

export function ShoppingListSheet({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["shopping"], queryFn: shoppingApi.list, enabled: open });
  const remove = useMutation({
    mutationFn: shoppingApi.remove,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["shopping"] }); },
  });
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetTitle>Shopping list</SheetTitle>
        <SheetDescription>Ingredients you plan to buy.</SheetDescription>
        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 size-11" onClick={onClose} aria-label="Close shopping list"><X size={20} aria-hidden="true" /></Button>
        {list.isPending && <p role="status">Loading shopping list...</p>}
        {list.isError && <p role="alert">Could not load shopping list: {list.error.message}</p>}
        {list.data?.length === 0 && <p className="text-muted-foreground">Your shopping list is empty.</p>}
        <ul className="space-y-2">
          {list.data?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
              <span>{item.name} · {item.quantity} {item.unit}</span>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${item.name}`} disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                <Trash2 size={18} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        {remove.isError && <p role="alert" className="text-destructive">Could not remove item: {remove.error.message}</p>}
      </SheetContent>
    </Sheet>
  );
}
