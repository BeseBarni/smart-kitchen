import type { ExpenseCategoryDto, ReceiptItemInput } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { expenseCategoryLabel } from "../utils/category-label.utils";

interface Props {
  index: number;
  item: ReceiptItemInput;
  categories: ExpenseCategoryDto[];
  onChange: (index: number, patch: Partial<ReceiptItemInput>) => void;
  onRemove: (index: number) => void;
}

export function ReceiptLineItemEditorRow({ index, item, categories, onChange, onRemove }: Props): React.JSX.Element {
  const { t } = useText();
  return <div className="grid grid-cols-[1fr_5rem] gap-2 rounded-xl border border-outline-variant p-3">
    <label className="text-label-md">{t("budget.itemName")}<input value={item.name} onChange={(event) => onChange(index, { name: event.target.value })}
      className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-3" /></label>
    <label className="text-label-md">{t("budget.amount")}<input type="number" min="0" step="0.01" value={item.amount}
      onChange={(event) => onChange(index, { amount: Number(event.target.value) })} className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-2 tabular-nums" /></label>
    <label className="text-label-md">{t("budget.category")}<select value={item.categoryId} onChange={(event) => onChange(index, { categoryId: event.target.value })}
      className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-2">{categories.map((category) => <option key={category.id} value={category.id}>{expenseCategoryLabel(category, t)}</option>)}</select></label>
    <button type="button" className="h-11 self-end rounded-lg text-label-md text-destructive" onClick={() => onRemove(index)}>{t("common.delete")}</button>
  </div>;
}
