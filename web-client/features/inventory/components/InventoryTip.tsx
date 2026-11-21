import { Lightbulb } from "lucide-react";
import { useText } from "@/lib/i18n";

export function InventoryTip(): React.JSX.Element {
  const { t } = useText();
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted p-3.5">
      <Lightbulb size={20} className="shrink-0 text-primary" aria-hidden="true" />
      <div><p className="text-label-sm">{t("inventory.tipTitle")}</p><p className="text-body-sm text-muted-foreground">{t("inventory.tip")}</p></div>
    </div>
  );
}
