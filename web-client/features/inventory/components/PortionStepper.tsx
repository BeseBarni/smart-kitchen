import { Minus, Plus } from "lucide-react";

interface Props {
  name: string;
  portions: number;
  disabled?: boolean;
  onAdjust: (delta: 1 | -1) => void;
}

export function PortionStepper({ name, portions, disabled = false, onAdjust }: Props): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center rounded-full bg-muted">
      <button type="button" disabled={disabled} onClick={() => onAdjust(-1)} aria-label={`Decrease portions for ${name}`} className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="numeric-tabular min-w-4 text-center text-numeric-tabular">{portions}</span>
      <button type="button" disabled={disabled} onClick={() => onAdjust(1)} aria-label={`Increase portions for ${name}`} className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
