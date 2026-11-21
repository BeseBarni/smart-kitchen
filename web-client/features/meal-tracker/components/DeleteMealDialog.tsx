"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMealLogMutations } from "../hooks/use-meal-log-mutations";

export function DeleteMealDialog({ candidate, onClose }: { candidate: { id: string; name: string; hasInventoryLink: boolean }; onClose: () => void }): React.JSX.Element {
  const [restore, setRestore] = useState(false);
  const { remove } = useMealLogMutations();
  const submit = async (): Promise<void> => {
    try { await remove.mutateAsync({ id: candidate.id, restore }); onClose(); }
    catch { /* Mutation reports the error and keeps the dialog open. */ }
  };
  return <Sheet open onOpenChange={(open) => { if (!open && !remove.isPending) onClose(); }}>
    <SheetContent side="bottom" className="mx-auto w-full max-w-[430px] rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <SheetTitle>Delete {candidate.name}?</SheetTitle><SheetDescription>This removes the meal from your daily totals.</SheetDescription>
      {candidate.hasInventoryLink && <label className="flex min-h-11 items-center gap-2 text-body-sm"><input type="checkbox" checked={restore} onChange={(event) => setRestore(event.target.checked)} />Restore portion back to inventory</label>}
      <div className="flex gap-2"><Button variant="outline" type="button" className="h-11 flex-1" onClick={onClose} disabled={remove.isPending}>Cancel</Button><Button type="button" variant="destructive" className="h-11 flex-1" onClick={() => void submit()} disabled={remove.isPending}>Delete</Button></div>
    </SheetContent>
  </Sheet>;
}
