import { Minus, Plus } from "lucide-react";
import { useText } from "@/lib/i18n";

interface Props {
  name: string;
  portions: number;
  disabled?: boolean;
  onAdjust: (delta: 1 | -1) => void;
}

export function PortionStepper({ name, portions, disabled = false, onAdjust }: Props): React.JSX.Element {
  const { t, formatNumber } = useText();
  return (
    <div className="flex shrink-0 items-center rounded-full bg-muted">
      <button type="button" disabled={disabled} onClick={() => onAdjust(-1)} aria-label={t("inventory.decrease", { name })} className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="numeric-tabular min-w-4 text-center text-numeric-tabular">{formatNumber(portions)}</span>
      <button type="button" disabled={disabled} onClick={() => onAdjust(1)} aria-label={t("inventory.increase", { name })} className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
