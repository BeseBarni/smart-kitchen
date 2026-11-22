"use client";

import {
  CalendarDays,
  Banknote,
  Check,
  Circle,
  Coffee,
  CookingPot,
  Plus,
  ReceiptText,
  ShoppingBasket,
  SprayCan,
  Store,
  Tag,
} from "lucide-react";
import type { ExpenseCategoryDto, MerchantDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { expenseCategoryLabel } from "../utils/category-label.utils";

type Props = {
  amount: number;
  currency: string;
  merchantName: string;
  merchantId: string | null;
  purchasedAt: string;
  selectedCategoryId: string;
  categories: ExpenseCategoryDto[];
  merchants: MerchantDto[];
  onAmountChange: (amount: number) => void;
  onMerchantNameChange: (name: string) => void;
  onMerchantSelect: (merchant: MerchantDto) => void;
  onCategorySelect: (category: ExpenseCategoryDto) => void;
  onPurchasedAtChange: (value: string) => void;
  onScanReceipt: () => void;
};

function localDateValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function categoryIcon(slug: string): React.JSX.Element {
  const className = "size-[18px]";
  switch (slug) {
    case "food": return <ShoppingBasket className={className} />;
    case "household": return <SprayCan className={className} />;
    case "entertainment": return <Coffee className={className} />;
    case "other": return <CookingPot className={className} />;
    default: return <Tag className={className} />;
  }
}

function categoryDescription(slug: string, t: ReturnType<typeof useText>["t"]): string {
  switch (slug) {
    case "food": return t("budget.manualCategoryFoodHint");
    case "household": return t("budget.manualCategoryHouseholdHint");
    case "entertainment": return t("budget.manualCategoryDiningHint");
    default: return t("budget.manualCategoryOtherHint");
  }
}

function currencySymbol(currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
}

export function ManualExpenseFields({
  amount,
  currency,
  merchantName,
  merchantId,
  purchasedAt,
  selectedCategoryId,
  categories,
  merchants,
  onAmountChange,
  onMerchantNameChange,
  onMerchantSelect,
  onCategorySelect,
  onPurchasedAtChange,
  onScanReceipt,
}: Props): React.JSX.Element {
  const { t, formatDate, formatNumber } = useText();
  const today = localDateValue(new Date());
  const yesterday = localDateValue(new Date(new Date().getTime() - 24 * 60 * 60 * 1000));
  const selectedDate = new Date(purchasedAt);
  const purchaseDate = localDateValue(selectedDate);
  const symbol = currencySymbol(currency);

  return <div className="space-y-3 px-4 pb-3">
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-low p-4">
      <div className="mb-1 flex w-full items-center justify-between">
        <label htmlFor="manual-expense-amount" className="text-label-sm uppercase tracking-wider text-on-surface-variant">
          {t("budget.amountSpent")}
        </label>
        <span className="flex items-center gap-1 rounded-full bg-surface-container-lowest px-2.5 py-1 text-label-sm text-primary shadow-sm">
        <Banknote aria-hidden="true" className="size-[13px]" />{currency}
        </span>
      </div>
      <div className="flex items-center justify-center py-1">
        <input id="manual-expense-amount" type="number" min="0" step="any" inputMode="decimal"
          value={amount || ""} onChange={(event) => onAmountChange(Number(event.target.value) || 0)}
          className="w-full min-w-0 bg-transparent text-center text-display-lg font-bold tracking-tight text-on-surface outline-none placeholder:text-outline"
          placeholder="0" />
        <span className="ml-1.5 shrink-0 text-display-lg font-bold text-primary">{symbol}</span>
      </div>
      <div className="grid w-full grid-cols-4 gap-1.5 pt-1">
        {[500, 1000, 5000].map((increment) => <button key={increment} type="button" onClick={() => onAmountChange(amount + increment)}
          className="min-h-11 rounded-xl bg-surface-container-lowest px-2 text-label-sm text-on-surface transition-colors hover:bg-secondary-container">
          +{formatNumber(increment)}
        </button>)}
        <button type="button" onClick={() => onAmountChange(0)}
          className="min-h-11 rounded-xl bg-surface-container-highest px-2 text-label-sm text-on-surface-variant transition-colors hover:bg-error-container">
          {t("budget.resetAmount")}
        </button>
      </div>
    </section>

    <section className="space-y-1.5">
      <label htmlFor="manual-expense-merchant" className="flex items-center justify-between text-label-sm font-medium text-on-surface-variant">
        <span>{t("budget.merchant")}</span>
        <span className="text-primary">{t("budget.quickSelect")}</span>
      </label>
      <div className="relative flex items-center">
        <Store aria-hidden="true" className="absolute left-3 size-[19px] text-on-surface-variant" />
        <input id="manual-expense-merchant" value={merchantName}
          onChange={(event) => onMerchantNameChange(event.target.value)}
          placeholder={t("budget.merchantSearch")}
          className="h-11 w-full rounded-xl bg-surface-container-low pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pt-1">
        {merchants.map((merchant) => <button key={merchant.id} type="button"
          onClick={() => onMerchantSelect(merchant)}
          aria-pressed={merchantId === merchant.id}
          className={`min-h-11 shrink-0 rounded-full px-3 text-label-sm transition-colors ${merchantId === merchant.id ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
          {merchant.name}
        </button>)}
      </div>
    </section>

    <section className="space-y-1.5">
      <h3 className="text-label-sm font-medium text-on-surface-variant">{t("budget.categoryStream")}</h3>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const selected = category.id === selectedCategoryId;
          return <button key={category.id} type="button" onClick={() => onCategorySelect(category)}
            aria-pressed={selected}
            className={`flex min-h-[72px] items-center justify-between gap-1 rounded-xl p-2 text-left transition-colors ${selected ? "bg-secondary-container text-on-secondary-container ring-1 ring-primary/40" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
            <span className="flex min-w-0 items-center gap-2">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                {categoryIcon(category.slug)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-title-sm leading-tight">{expenseCategoryLabel(category, t)}</span>
                <span className={`truncate text-label-sm ${selected ? "text-primary" : "text-on-surface-variant"}`}>
                  {categoryDescription(category.slug, t)}
                </span>
              </span>
            </span>
            {selected ? <Check aria-hidden="true" className="size-[18px] shrink-0 text-primary" /> : <Circle aria-hidden="true" className="size-[18px] shrink-0 text-outline-variant" />}
          </button>;
        })}
      </div>
    </section>

    <section className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-2">
      <div className="flex min-w-0 items-center gap-2">
        <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col">
          <label htmlFor="manual-expense-date" className="text-label-sm text-on-surface-variant">{t("budget.purchaseDate")}</label>
          <input id="manual-expense-date" type="date" value={purchaseDate}
            onChange={(event) => {
              if (event.target.value) onPurchasedAtChange(new Date(`${event.target.value}T12:00:00`).toISOString());
            }}
            className="max-w-[155px] bg-transparent text-title-sm text-on-surface outline-none" />
          <span className="sr-only">{formatDate(selectedDate, { dateStyle: "long" })}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => onPurchasedAtChange(new Date(`${today}T12:00:00`).toISOString())}
          aria-pressed={purchaseDate === today}
          className={`min-h-11 rounded-lg px-2.5 text-label-sm ${purchaseDate === today ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest text-on-surface-variant"}`}>
          {t("budget.today")}
        </button>
        <button type="button" onClick={() => onPurchasedAtChange(new Date(`${yesterday}T12:00:00`).toISOString())}
          aria-pressed={purchaseDate === yesterday}
          className={`min-h-11 rounded-lg px-2.5 text-label-sm ${purchaseDate === yesterday ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest text-on-surface-variant"}`}>
          {t("budget.yesterday")}
        </button>
      </div>
    </section>

    <button type="button" onClick={onScanReceipt}
      className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl bg-primary/10 p-3 text-left">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary shadow-sm">
          <ReceiptText aria-hidden="true" className="size-[22px]" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-title-sm text-on-surface">
            {t("budget.autoExtractReceipt")}
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-on-primary">{t("budget.aiBadge")}</span>
          </span>
          <span className="block truncate text-body-sm text-on-surface-variant">{t("budget.scanDescription")}</span>
        </span>
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary shadow-sm">
        <Plus aria-hidden="true" className="size-5" />
      </span>
    </button>
  </div>;
}
