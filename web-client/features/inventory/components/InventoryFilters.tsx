import type { StorageFilter } from "../utils/inventory-selectors";
import { useText } from "@/lib/i18n";

interface Props {
  filter: StorageFilter;
  counts: Record<StorageFilter, number>;
  onChange: (filter: StorageFilter) => void;
}

export function InventoryFilters({ filter, counts, onChange }: Props): React.JSX.Element {
  const { t, formatNumber } = useText();
  const options: { value: StorageFilter; label: string }[] = [
    { value: "all", label: t("inventory.all") },
    { value: "fridge", label: t("inventory.fridge") },
    { value: "freezer", label: t("inventory.freezer") },
    { value: "pantry", label: t("inventory.pantry") },
  ];
  return (
    <div aria-label={t("inventory.storageFilter")} className="hide-scrollbar flex gap-2 overflow-x-auto">
      {options.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => onChange(value)} className="flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-ring">
          <span className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-label-md ${filter === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"}`}>
            {label} <span className="numeric-tabular">{formatNumber(counts[value])}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
