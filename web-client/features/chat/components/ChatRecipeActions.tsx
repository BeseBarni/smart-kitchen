"use client";

import { BookmarkPlus, CookingPot } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatRecipeActionsState } from "../hooks/use-chat-recipe-actions";

export function ChatRecipeActions({ actions }: { actions: ChatRecipeActionsState }): React.JSX.Element {
  return (
    <div className="space-y-2">
      {actions.showSave && <Button type="button" className="h-11 w-full" disabled={actions.saveDisabled} onClick={actions.save}><BookmarkPlus aria-hidden="true" />{actions.savePending ? "Saving..." : "Save recipe"}</Button>}
      {actions.existingId && (
        <div className="space-y-2 rounded-xl bg-muted p-3">
          <h3 className="text-title-sm">Cook and stock</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-label-md">Portions<input type="number" min="0.01" step="any" value={actions.quantity} onChange={(event) => actions.setQuantity(event.target.value)} className="h-11 w-full rounded-lg border bg-card px-3" /></label>
            <label className="text-label-md">Storage<select value={actions.location} onChange={(event) => {
              const value = event.target.value;
              if (value === "fridge" || value === "freezer" || value === "pantry") actions.setLocation(value);
            }} className="h-11 w-full rounded-lg border bg-card px-3"><option value="fridge">Fridge</option><option value="freezer">Freezer</option><option value="pantry">Pantry</option></select></label>
          </div>
          <Button type="button" className="h-11 w-full" disabled={actions.cookDisabled} onClick={() => { if (actions.existingId) actions.cook(actions.existingId); }}><CookingPot aria-hidden="true" />{actions.cookPending ? "Stocking..." : "Cook & stock"}</Button>
        </div>
      )}
    </div>
  );
}
