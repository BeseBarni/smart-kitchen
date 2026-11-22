"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { CreateReceiptInput, ExpenseCategoryDto, ReceiptDetailDto } from "@app/modules/schemas";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ImageUploadField } from "@/components/media/ImageUploadField";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { useBudgetUiStore } from "../stores/budget-ui.store";
import { useBudgetMutations } from "../hooks/use-budget-mutations";
import { useRecommendedMerchants } from "../hooks/use-recommended-merchants";
import { useBudgetOverview } from "../hooks/use-budget-overview";
import { MerchantSelectChips } from "./MerchantSelectChips";
import { useExtractReceiptFromMedia } from "../hooks/use-extract-receipt-from-media";
import { useCommitScannedReceipt } from "../hooks/use-commit-scanned-receipt";
import { ManualExpenseFields } from "./ManualExpenseFields";
import { X } from "lucide-react";

const EMPTY_CATEGORIES: ExpenseCategoryDto[] = [];

const formSchema = z.object({
  purchasedAt: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  merchantId: z.string().nullable(),
  merchantName: z.string(),
  title: z.string(),
  items: z.array(z.object({
    name: z.string().min(1),
    categoryId: z.string().min(1),
    amount: z.number().nonnegative(),
    quantity: z.number().positive().optional(),
    unit: z.string().optional(),
  })).min(1),
});
type FormValues = z.infer<typeof formSchema>;

export function ReceiptFormSheet({ detail }: { detail?: ReceiptDetailDto }): React.JSX.Element {
  const { t, formatCurrency } = useText();
  const ui = useBudgetUiStore();
  const overview = useBudgetOverview();
  const merchantQuery = useRecommendedMerchants();
  const mutations = useBudgetMutations();
  const extract = useExtractReceiptFromMedia();
  const commitScanned = useCommitScannedReceipt();
  const [stockItems, setStockItems] = useState(true);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(detail?.mediaAssetId ?? null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(detail?.mediaUrl ?? null);
  const preview = extract.data ?? null;
  const categories = useMemo(() => overview.categories.data ?? EMPTY_CATEGORIES, [overview.categories.data]);
  const defaultCategory = categories[0]?.id ?? "";
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultPurchasedAt = ui.selectedYearMonth === currentYearMonth
    ? now.toISOString()
    : new Date(`${ui.selectedYearMonth}-01T12:00:00`).toISOString();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchasedAt: detail?.purchasedAt ?? defaultPurchasedAt,
      currency: detail?.currency ?? "HUF",
      merchantId: detail?.merchant?.id ?? null,
      merchantName: detail?.merchant?.name ?? "",
      title: detail?.title ?? "",
      items: detail?.items.map((item) => ({ name: item.name, categoryId: item.category.id, amount: item.amount, quantity: item.quantity, unit: item.unit ?? undefined }))
        ?? [{ name: categories[0]?.label ?? "", categoryId: defaultCategory, amount: 0, quantity: 1, unit: undefined }],
    },
  });
  const { fields: lineItemFields, append, remove, replace } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedPurchasedAt = useWatch({ control: form.control, name: "purchasedAt" });
  const watchedCurrency = useWatch({ control: form.control, name: "currency" });
  const watchedMerchantId = useWatch({ control: form.control, name: "merchantId" });
  const watchedMerchantName = useWatch({ control: form.control, name: "merchantName" });
  useEffect(() => {
    const data = extract.data;
    if (!data) return;
    form.setValue("purchasedAt", data.purchasedAt);
    form.setValue("currency", data.currency);
    if (data.matchedMerchantId) form.setValue("merchantId", data.matchedMerchantId);
    form.setValue("merchantName", data.matchedMerchantName ?? data.merchantName ?? "");
    replace(data.items.map((item) => ({
      name: item.name,
      categoryId: item.categoryId,
      amount: item.amount,
      quantity: item.quantity,
      unit: item.unit,
    })));
  }, [extract.data, form, replace]);
  useEffect(() => {
    const firstCategory = categories[0];
    if (firstCategory && !detail && lineItemFields.length === 1 && form.getValues("items.0.categoryId") === "") {
      form.setValue("items.0.categoryId", firstCategory.id);
      form.setValue("items.0.name", firstCategory.label);
    }
  }, [categories, detail, lineItemFields.length, form]);
  const open = ui.activeSheet === "create-manual" || ui.activeSheet === "create-scanned" || ui.activeSheet === "edit-receipt";
  const manualMode = ui.activeSheet === "create-manual" && !detail;
  const submit = (values: FormValues): void => {
    if (ui.activeSheet === "edit-receipt" && !detail) return;
    const input = {
      ...(values.merchantId ? { merchantId: values.merchantId } : { merchantName: values.merchantName }),
      source: ui.activeSheet === "create-scanned" ? "scanned" : detail?.source ?? "manual",
      purchasedAt: values.purchasedAt,
      currency: values.currency,
      ...(values.title ? { title: values.title } : {}),
      mediaAssetId,
      items: values.items,
    } as const;
    if (detail) {
      mutations.update.mutate({ id: detail.id, input });
    } else if (ui.activeSheet === "create-scanned" && preview && stockItems) {
      commitScanned.mutate({
        mediaAssetId: preview.mediaAssetId,
        ...(values.merchantId ? { merchantId: values.merchantId } : { merchantName: values.merchantName || preview.merchantName || "Unknown merchant" }),
        purchasedAt: values.purchasedAt,
        currency: values.currency,
        ...(values.title ? { title: values.title } : {}),
        items: values.items.map((item, index) => {
          const enriched = preview.items[index];
          return {
            name: item.name,
            rawReceiptText: enriched?.rawReceiptText,
            categoryId: item.categoryId,
            amount: item.amount,
            quantity: item.quantity ?? 1,
            unit: item.unit,
            addToInventory: Boolean(enriched?.isFoodItem && stockItems),
            storageLocation: enriched?.storageLocation,
            shelfLifeDays: enriched?.shelfLifeDays,
            tags: enriched?.suggestedTags,
            stockImageKind: enriched?.stockImageKind,
            stockImageName: enriched?.stockImageName,
          };
        }),
      });
    } else {
      mutations.create.mutate(input as CreateReceiptInput);
    }
    ui.closeSheet();
  };
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const purchasedAt = watchedPurchasedAt ?? defaultPurchasedAt;
  const firstItem = watchedItems?.[0];
  const manualTitle = t("budget.manualExpenseTitle");
  return <Sheet open={open} onOpenChange={(value) => { if (!value) ui.closeSheet(); }}>
    <SheetContent side="bottom" showCloseButton={!manualMode}
      overlayClassName={manualMode ? "bg-inverse-surface/40 backdrop-blur-md" : undefined}
      className={manualMode
        ? "mx-auto !bottom-16 flex max-h-[calc(100dvh-6rem)] w-full max-w-[430px] flex-col gap-0 overflow-hidden rounded-t-[28px] border-0 bg-stitch-surface-container-lowest p-0 shadow-2xl"
        : "mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"}>
      {manualMode ? <>
        <div className="flex shrink-0 justify-center pt-3 pb-1" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-outline-variant/60" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-4 pt-1 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <SheetTitle className="text-title-sm text-on-surface">{manualTitle}</SheetTitle>
            </div>
            <SheetDescription className="mt-0.5 text-body-sm text-on-surface-variant">{t("budget.manualExpenseDescription")}</SheetDescription>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.close")} onClick={ui.closeSheet}
            className="size-9 rounded-full bg-surface-container-low text-on-surface-variant">
            <X className="size-[19px]" />
          </Button>
        </div>
      </> : <>
        <SheetTitle className="pr-10">{detail ? t("budget.editReceipt") : t("budget.addExpense")}</SheetTitle>
        <SheetDescription>{t("budget.subtitle")}</SheetDescription>
      </>}
      <form onSubmit={form.handleSubmit(submit)} className={manualMode ? "flex min-h-0 flex-1 flex-col" : "space-y-4"}>
        {manualMode ? <div className="min-h-0 flex-1 overflow-y-auto">
          <ManualExpenseFields
            amount={Number(firstItem?.amount) || 0}
            currency={watchedCurrency}
            merchantName={watchedMerchantName}
            merchantId={watchedMerchantId}
            purchasedAt={purchasedAt}
            selectedCategoryId={firstItem?.categoryId ?? ""}
            categories={categories}
            merchants={merchantQuery.merchants}
            onAmountChange={(amount) => form.setValue("items.0.amount", amount, { shouldDirty: true, shouldValidate: true })}
            onMerchantNameChange={(name) => {
              form.setValue("merchantName", name, { shouldDirty: true });
              form.setValue("merchantId", null, { shouldDirty: true });
              merchantQuery.setSearch(name);
            }}
            onMerchantSelect={(merchant) => {
              form.setValue("merchantId", merchant.id, { shouldDirty: true });
              form.setValue("merchantName", merchant.name, { shouldDirty: true });
              merchantQuery.setSearch(merchant.name);
              if (merchant.defaultCategoryId) {
                const category = categories.find((candidate) => candidate.id === merchant.defaultCategoryId);
                if (category) {
                  form.setValue("items.0.categoryId", category.id, { shouldDirty: true });
                  form.setValue("items.0.name", category.label, { shouldDirty: true });
                }
              }
            }}
            onCategorySelect={(category) => {
              form.setValue("items.0.categoryId", category.id, { shouldDirty: true });
              form.setValue("items.0.name", category.label, { shouldDirty: true });
            }}
            onPurchasedAtChange={(value) => form.setValue("purchasedAt", value, { shouldDirty: true, shouldValidate: true })}
            onScanReceipt={() => ui.openSheet("create-scanned")}
          />
        </div> : <>
        {ui.activeSheet === "create-scanned" && <ImageUploadField purpose="receipt_scan" variant="wide" valueUrl={mediaUrl}
          labels={{ choose: t("budget.photoChoose"), camera: t("budget.photoCamera"), replace: t("budget.photoReplace"), remove: t("budget.photoRemove"), uploading: t("budget.photoUploading") }}
          onUploaded={(image) => {
            extract.reset();
            setMediaAssetId(image.assetId);
            setMediaUrl(image.previewUrl);
            extract.mutate(image.assetId);
          }}
          onRemoved={() => { extract.reset(); setMediaAssetId(null); setMediaUrl(null); }} />}
        {extract.isPending ? <p role="status" className="rounded-lg bg-secondary p-3 text-label-md text-primary">{t("budget.scanningReceipt")}</p> : null}
        {extract.isError ? (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-body-sm">
            <p>{t("budget.receiptExtractionError")}</p>
            {mediaAssetId ? <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => extract.mutate(mediaAssetId)}>{t("common.retry")}</Button> : null}
          </div>
        ) : null}
        {preview ? (
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant p-3 text-label-md">
            <input type="checkbox" checked={stockItems} onChange={(event) => setStockItems(event.target.checked)} className="size-5" />
            {t("budget.stockInInventory")} · {t("budget.stockCount", { count: preview.items.filter((item) => item.isFoodItem).length })}
          </label>
        ) : null}
        <MerchantSelectChips merchants={merchantQuery.merchants} selectedId={watchedMerchantId}
          merchantName={watchedMerchantName}
          onSearch={merchantQuery.setSearch}
          onExisting={(merchant) => { form.setValue("merchantId", merchant.id); form.setValue("merchantName", merchant.name); if (merchant.defaultCategoryId) lineItemFields.forEach((_field, index) => form.setValue(`items.${index}.categoryId`, merchant.defaultCategoryId ?? "")); }}
          onName={(value) => { form.setValue("merchantName", value); form.setValue("merchantId", null); }} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-label-md">{t("budget.purchaseDate")}<input type="datetime-local" value={purchasedAt.slice(0, 16)}
            onChange={(event) => form.setValue("purchasedAt", new Date(event.target.value).toISOString())} className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-2" /></label>
          <label className="text-label-md">{t("budget.amount")}<input value={watchedCurrency} onChange={(event) => form.setValue("currency", event.target.value.toUpperCase())}
            maxLength={3} className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-3 uppercase" /></label>
        </div>
        <div className="space-y-2">{lineItemFields.map((field, index) => <div key={field.id} className="rounded-xl border border-outline-variant p-3">
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <input {...form.register(`items.${index}.name`)} placeholder={t("budget.itemName")} className="h-11 rounded-lg border border-outline-variant px-3" />
            <input type="number" step="0.01" {...form.register(`items.${index}.amount`, { valueAsNumber: true })} placeholder={t("budget.amount")} className="h-11 rounded-lg border border-outline-variant px-2 tabular-nums" />
          </div>
          <select {...form.register(`items.${index}.categoryId`)} className="mt-2 h-11 w-full rounded-lg border border-outline-variant px-2">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="number" min="0.01" step="0.01" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} placeholder={t("budget.quantity")} className="h-11 rounded-lg border border-outline-variant px-3" />
            <input {...form.register(`items.${index}.unit`)} placeholder={t("budget.unit")} className="h-11 rounded-lg border border-outline-variant px-3" />
          </div>
          <button type="button" className="mt-2 min-h-11 text-label-md text-destructive" onClick={() => remove(index)}>{t("common.delete")}</button>
        </div>)}</div>
        <Button type="button" variant="outline" className="h-11 w-full" onClick={() => append({ name: "", categoryId: defaultCategory, amount: 0, quantity: 1 })}>{t("budget.addItem")}</Button>
        </>}
        <div className={manualMode
          ? "shrink-0 border-t border-outline-variant bg-stitch-surface-container-lowest px-4 pt-3 pb-[env(safe-area-inset-bottom,0px)]"
          : "sticky bottom-0 flex items-center justify-between border-t border-outline-variant bg-popover py-3"}>
          {manualMode ? <div className="space-y-2">
            <Button type="submit" className="h-12 w-full rounded-xl text-headline-md"
              disabled={mutations.create.isPending}
              aria-label={t("budget.saveExpenseTotal", { amount: formatCurrency(total, watchedCurrency) })}>
              <span className="flex items-center gap-2"><span aria-hidden="true">✓</span>
                {t("budget.saveExpenseTotal", { amount: formatCurrency(total, watchedCurrency) })}
              </span>
            </Button>
            <Button type="button" variant="ghost" className="h-9 w-full text-label-md text-on-surface-variant" onClick={ui.closeSheet}>
              {t("budget.discardAndReturn")}
            </Button>
          </div> : <>
            <strong className="tabular-nums">{watchedCurrency} {total.toFixed(2)}</strong>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={ui.closeSheet}>{t("budget.discard")}</Button><Button type="submit" disabled={mutations.create.isPending || mutations.update.isPending || commitScanned.isPending || extract.isPending}>{t("budget.saveExpense")}</Button></div>
          </>}
        </div>
      </form>
    </SheetContent>
  </Sheet>;
}
