"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMealLogMutations } from "../hooks/use-meal-log-mutations";
import { useText } from "@/lib/i18n";

export function DeleteMealDialog({ candidate, onClose }: { candidate: { id: string; name: string; hasInventoryLink: boolean }; onClose: () => void }): React.JSX.Element {
  const { t } = useText();
  const [restore, setRestore] = useState(false);
  const { remove } = useMealLogMutations();
  const submit = async (): Promise<void> => {
    remove.mutate({ id: candidate.id, restore });
    onClose();
  };
  return <Sheet open onOpenChange={(open) => { if (!open && !remove.isPending) onClose(); }}>
    <SheetContent side="bottom" className="mx-auto w-full max-w-[430px] rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <SheetTitle>{t("mealTracker.deleteQuestion", { name: candidate.name })}</SheetTitle><SheetDescription>{t("mealTracker.deleteDescription")}</SheetDescription>
      {candidate.hasInventoryLink && <label className="flex min-h-11 items-center gap-2 text-body-sm"><input type="checkbox" checked={restore} onChange={(event) => setRestore(event.target.checked)} />{t("mealTracker.restore")}</label>}
      <div className="flex gap-2"><Button variant="outline" type="button" className="h-11 flex-1" onClick={onClose} disabled={remove.isPending}>{t("common.cancel")}</Button><Button type="button" variant="destructive" className="h-11 flex-1" onClick={() => void submit()} disabled={remove.isPending}>{t("common.delete")}</Button></div>
    </SheetContent>
  </Sheet>;
}
