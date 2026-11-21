"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { shoppingApi } from "../api/shopping.api";
import { useText } from "@/lib/i18n";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";
import { removeOptimisticShopping } from "../utils/shopping-cache.utils";

export function ShoppingListSheet({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const { t, formatNumber } = useText();
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["shopping"], queryFn: shoppingApi.list, enabled: open });
  const remove = useMutation({
    mutationFn: shoppingApi.remove,
    mutationKey: ["shopping", "remove"],
    onMutate: async (id) => {
      const context = await snapshotQueryCaches(client, [["shopping"]]);
      removeOptimisticShopping(client, id);
      return context;
    },
    onError: (_error, _id, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["shopping", "remove"], [["shopping"]]);
    },
  });
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetTitle>{t("shopping.title")}</SheetTitle>
        <SheetDescription>{t("shopping.description")}</SheetDescription>
        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 size-11" onClick={onClose} aria-label={t("shopping.close")}><X size={20} aria-hidden="true" /></Button>
        {list.isPending && <p role="status">{t("shopping.loading")}</p>}
        {list.isError && <p role="alert">{t("shopping.loadError")}</p>}
        {list.data?.length === 0 && <p className="text-muted-foreground">{t("shopping.empty")}</p>}
        <ul className="space-y-2">
          {list.data?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
              <span>{item.name} · {formatNumber(item.quantity)} {item.unit}</span>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={t("shopping.remove", { name: item.name })} disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                <Trash2 size={18} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        {remove.isError && <p role="alert" className="text-destructive">{t("shopping.removeError")}</p>}
      </SheetContent>
    </Sheet>
  );
}
