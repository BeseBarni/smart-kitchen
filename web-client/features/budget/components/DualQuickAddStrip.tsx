import { Camera, Plus } from "lucide-react";
import { useText } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function DualQuickAddStrip({ onScan, onManual }: { onScan: () => void; onManual: () => void }): React.JSX.Element {
  const { t } = useText();
  return <div className="grid grid-cols-2 gap-2">
    <Button type="button" className="h-12" onClick={onScan}><Camera size={18} />{t("budget.scanReceipt")}</Button>
    <Button type="button" variant="secondary" className="h-12" onClick={onManual}><Plus size={18} />{t("budget.addExpense")}</Button>
  </div>;
}
