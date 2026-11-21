import type { InventoryDetail } from "../../types";
import { useText, type TranslationKey } from "@/lib/i18n";

interface Props {
  item: InventoryDetail;
}

export function ItemChipRow({ item }: Props): React.JSX.Element {
  const { t } = useText();
  const typeKey = item.itemType === "meal_prep"
    ? "inventory.detailTypeMeal"
    : item.itemType === "ingredient"
      ? "inventory.detailTypeIngredient"
      : "inventory.detailTypePackaged";
  return (
    <div className="flex flex-wrap gap-2" aria-label={t("inventory.detailChips")}>
      <span className="rounded-full bg-primary px-3 py-1.5 text-label-sm text-primary-foreground">{t(typeKey)}</span>
      {(item.tags ?? []).slice(0, 3).map((tag) => (
        <span
          key={tag.id}
          className="rounded-full border border-border bg-muted px-3 py-1.5 text-label-sm"
        >
          {tag.i18nKey ? t(tag.i18nKey as TranslationKey) : tag.label}
        </span>
      ))}
    </div>
  );
}
