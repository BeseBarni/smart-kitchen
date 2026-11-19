import { Lightbulb } from "lucide-react";

export function InventoryTip(): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted p-3.5">
      <Lightbulb size={20} className="shrink-0 text-primary" aria-hidden="true" />
      <div><p className="text-label-sm">Pre-thaw tip</p><p className="text-body-sm text-muted-foreground">Plan ahead when moving a meal from the freezer to the fridge.</p></div>
    </div>
  );
}
