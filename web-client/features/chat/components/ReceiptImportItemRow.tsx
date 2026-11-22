import { useText } from "@/lib/i18n";
import type { ExpenseCategoryDto } from "@app/modules/schemas";
import type { UiDirective } from "../types";

type ReceiptItem = Extract<UiDirective, { component: "receipt_import_card" }>["items"][number] & {
  selected: boolean;
  addToInventory: boolean;
};

export function ReceiptImportItemRow({ item, currency, categories, onChange }: {
  item: ReceiptItem;
  currency: string;
  categories: ExpenseCategoryDto[];
  onChange: (patch: Partial<ReceiptItem>) => void;
}) {
  const { t, formatNumber } = useText();
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={item.selected} onChange={(event) => onChange({ selected: event.target.checked })} className="mt-1 size-5" />
        <div className="min-w-0 flex-1">
          <input value={item.name} onChange={(event) => onChange({ name: event.target.value })} className="h-9 w-full rounded-md border border-outline-variant px-2 text-label-lg" />
          <p className="mt-1 text-label-md text-muted-foreground">{formatNumber(item.quantity)} {item.unit}</p>
        </div>
        <label className="w-24 text-label-sm">
          {t("chat.paidAmount")}
          <input type="number" min="0" step="0.01" value={item.amount ?? item.priceAmount ?? 0}
            onChange={(event) => onChange({ amount: Number(event.target.value), priceAmount: Number(event.target.value) })}
            className="mt-1 h-9 w-full rounded-md border border-outline-variant px-2 tabular-nums" />
          <span className="sr-only">{currency}</span>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label={t("chat.category")}>
        {categories.slice(0, 6).map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange({ categoryId: category.id, categorySlug: category.slug })}
            className={`min-h-11 rounded-full border px-3 text-label-sm ${item.categoryId === category.id ? "border-primary bg-primary/10 text-primary" : "border-outline-variant"}`}
          >
            {category.label}
          </button>
        ))}
      </div>
      {item.isFoodItem ? (
        <div className="mt-2 space-y-2 rounded-lg bg-muted p-2">
          <label className="flex min-h-11 items-center gap-2 text-label-md">
            <input type="checkbox" checked={item.addToInventory} onChange={(event) => onChange({ addToInventory: event.target.checked })} className="size-5" />
            {t("chat.stockInInventory")}
          </label>
          {item.addToInventory ? (
            <div className="grid grid-cols-3 gap-1">
              {(["fridge", "freezer", "pantry"] as const).map((location) => (
                <button key={location} type="button" onClick={() => onChange({ storageLocation: location })}
                  className={`min-h-11 rounded-lg border px-1 text-label-sm ${item.storageLocation === location ? "border-primary bg-primary/10" : "border-outline-variant"}`}>
                  {t(location === "fridge" ? "chat.storageFridge" : location === "freezer" ? "chat.storageFreezer" : "chat.storagePantry")}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
