import { ChevronLeft, ChevronRight } from "lucide-react";
import { useText } from "@/lib/i18n";
import { formatYearMonth } from "../utils/budget-date.utils";

interface Props {
  yearMonth: string;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
}

export function MonthSwitcher({ yearMonth, onPrevious, onNext, onCurrent }: Props): React.JSX.Element {
  const { locale, t } = useText();
  return <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-2 py-1">
    <button type="button" className="size-11 rounded-lg" aria-label={t("budget.monthPrevious")} onClick={onPrevious}><ChevronLeft className="mx-auto" size={20} /></button>
    <button type="button" className="min-h-11 flex-1 text-center text-title-sm tabular-nums" onClick={onCurrent} aria-label={t("budget.currentMonth")}>
      {formatYearMonth(yearMonth, locale)}
    </button>
    <button type="button" className="size-11 rounded-lg" aria-label={t("budget.monthNext")} onClick={onNext}><ChevronRight className="mx-auto" size={20} /></button>
  </div>;
}
