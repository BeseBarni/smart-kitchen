"use client";

import { BookmarkPlus, CookingPot } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatRecipeActionsState } from "../hooks/use-chat-recipe-actions";
import { useText } from "@/lib/i18n";

export function ChatRecipeActions({ actions }: { actions: ChatRecipeActionsState }): React.JSX.Element {
  const { t } = useText();
  return (
    <div className="space-y-2">
      {actions.showSave && <Button type="button" className="h-11 w-full" disabled={actions.saveDisabled} onClick={actions.save}><BookmarkPlus aria-hidden="true" />{t(actions.savePending ? "recipes.saving" : "recipes.save")}</Button>}
      {actions.existingId && (
        <div className="space-y-2 rounded-xl bg-muted p-3">
          <h3 className="text-title-sm">{t("recipes.cookStock")}</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-label-md">{t("recipes.portions")}<input type="number" min="0.01" step="any" value={actions.quantity} onChange={(event) => actions.setQuantity(event.target.value)} className="h-11 w-full rounded-lg border bg-card px-3" /></label>
            <label className="text-label-md">{t("chat.storage")}<select value={actions.location} onChange={(event) => {
              const value = event.target.value;
              if (value === "fridge" || value === "freezer" || value === "pantry") actions.setLocation(value);
            }} className="h-11 w-full rounded-lg border bg-card px-3"><option value="fridge">{t("inventory.fridge")}</option><option value="freezer">{t("inventory.freezer")}</option><option value="pantry">{t("inventory.pantry")}</option></select></label>
          </div>
          <Button type="button" className="h-11 w-full" disabled={actions.cookDisabled} onClick={() => { if (actions.existingId) actions.cook(actions.existingId); }}><CookingPot aria-hidden="true" />{t(actions.cookPending ? "recipes.stocking" : "recipes.cookStock")}</Button>
        </div>
      )}
    </div>
  );
}
