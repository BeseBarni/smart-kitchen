import type { MerchantDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";

export function MerchantSelectChips({ merchants, selectedId, merchantName, onSearch, onExisting, onName }: {
  merchants: MerchantDto[];
  selectedId: string | null;
  merchantName: string;
  onSearch: (value: string) => void;
  onExisting: (merchant: MerchantDto) => void;
  onName: (value: string) => void;
}): React.JSX.Element {
  const { t } = useText();
  return <section className="space-y-2">
    <div className="flex items-center justify-between"><h3 className="text-title-sm">{t("budget.merchant")}</h3><span className="text-label-md text-muted-foreground">{t("budget.recommended")}</span></div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {merchants.map((merchant) => <button type="button" key={merchant.id} onClick={() => onExisting(merchant)}
        className={`min-h-11 shrink-0 rounded-full px-3 ${selectedId === merchant.id ? "bg-primary text-on-primary" : "border border-outline-variant bg-surface-container-lowest"}`}>{merchant.name}</button>)}
    </div>
    <input value={merchantName} onChange={(event) => { onName(event.target.value); onSearch(event.target.value); }}
      placeholder={t("budget.merchantSearch")} className="h-11 w-full rounded-lg border border-outline-variant px-3" />
  </section>;
}
