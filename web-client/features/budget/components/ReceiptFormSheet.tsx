"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import type { CreateReceiptInput, ReceiptDetailDto, ReceiptItemInput } from "@app/modules/schemas";
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
import type { ExtractedReceiptPreviewDto } from "@app/modules/schemas";

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
  const { t } = useText();
  const ui = useBudgetUiStore();
  const overview = useBudgetOverview();
  const merchantQuery = useRecommendedMerchants();
  const mutations = useBudgetMutations();
  const extract = useExtractReceiptFromMedia();
  const commitScanned = useCommitScannedReceipt();
  const [stockItems, setStockItems] = useState(true);
  const [preview, setPreview] = useState<ExtractedReceiptPreviewDto | null>(null);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(detail?.mediaAssetId ?? null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(detail?.mediaUrl ?? null);
  const categories = overview.categories.data ?? [];
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
        ?? [{ name: "", categoryId: defaultCategory, amount: 0, quantity: 1, unit: undefined }],
    },
  });
  const fields = useFieldArray({ control: form.control, name: "items" });
  useEffect(() => {
    const data = extract.data;
    if (!data) return;
    setPreview(data);
    form.setValue("purchasedAt", data.purchasedAt);
    form.setValue("currency", data.currency);
    if (data.matchedMerchantId) form.setValue("merchantId", data.matchedMerchantId);
    form.setValue("merchantName", data.matchedMerchantName ?? data.merchantName ?? "");
    while (fields.fields.length > 0) fields.remove(0);
    data.items.forEach((item) => fields.append({
      name: item.name,
      categoryId: item.categoryId,
      amount: item.amount,
      quantity: item.quantity,
      unit: item.unit,
    }));
  }, [extract.data, form, fields]);
  useEffect(() => {
    const firstCategory = categories[0];
    if (firstCategory && !detail && fields.fields.length === 1 && form.getValues("items.0.categoryId") === "") {
      form.setValue("items.0.categoryId", firstCategory.id);
    }
  }, [categories, detail, fields.fields.length, form]);
  const open = ui.activeSheet === "create-manual" || ui.activeSheet === "create-scanned" || ui.activeSheet === "edit-receipt";
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
  const total = form.watch("items").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return <Sheet open={open} onOpenChange={(value) => { if (!value) ui.closeSheet(); }}>
    <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <SheetTitle>{detail ? t("budget.editReceipt") : t("budget.addExpense")}</SheetTitle>
      <SheetDescription>{t("budget.subtitle")}</SheetDescription>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        {ui.activeSheet === "create-scanned" && <ImageUploadField purpose="receipt_scan" variant="wide" valueUrl={mediaUrl}
          labels={{ choose: t("budget.photoChoose"), camera: t("budget.photoCamera"), replace: t("budget.photoReplace"), remove: t("budget.photoRemove"), uploading: t("budget.photoUploading") }}
          onUploaded={(image) => { setMediaAssetId(image.assetId); setMediaUrl(image.previewUrl); extract.mutate(image.assetId); }}
          onRemoved={() => { setMediaAssetId(null); setMediaUrl(null); }} />}
        {extract.isPending ? <p role="status" className="rounded-lg bg-secondary p-3 text-label-md text-primary">{t("budget.scanningReceipt")}</p> : null}
        {preview ? (
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant p-3 text-label-md">
            <input type="checkbox" checked={stockItems} onChange={(event) => setStockItems(event.target.checked)} className="size-5" />
            {t("budget.stockInInventory")} · {t("budget.stockCount", { count: preview.items.filter((item) => item.isFoodItem).length })}
          </label>
        ) : null}
        <MerchantSelectChips merchants={merchantQuery.merchants} selectedId={form.watch("merchantId")}
          merchantName={form.watch("merchantName")}
          onSearch={merchantQuery.setSearch}
          onExisting={(merchant) => { form.setValue("merchantId", merchant.id); form.setValue("merchantName", merchant.name); if (merchant.defaultCategoryId) fields.fields.forEach((_field, index) => form.setValue(`items.${index}.categoryId`, merchant.defaultCategoryId ?? "")); }}
          onName={(value) => { form.setValue("merchantName", value); form.setValue("merchantId", null); }} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-label-md">{t("budget.purchaseDate")}<input type="datetime-local" value={form.watch("purchasedAt").slice(0, 16)}
            onChange={(event) => form.setValue("purchasedAt", new Date(event.target.value).toISOString())} className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-2" /></label>
          <label className="text-label-md">{t("budget.amount")}<input value={form.watch("currency")} onChange={(event) => form.setValue("currency", event.target.value.toUpperCase())}
            maxLength={3} className="mt-1 h-11 w-full rounded-lg border border-outline-variant px-3 uppercase" /></label>
        </div>
        <div className="space-y-2">{fields.fields.map((field, index) => <div key={field.id} className="rounded-xl border border-outline-variant p-3">
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
          <button type="button" className="mt-2 min-h-11 text-label-md text-destructive" onClick={() => fields.remove(index)}>{t("common.delete")}</button>
        </div>)}</div>
        <Button type="button" variant="outline" className="h-11 w-full" onClick={() => fields.append({ name: "", categoryId: defaultCategory, amount: 0, quantity: 1 })}>{t("budget.addItem")}</Button>
        <div className="sticky bottom-0 flex items-center justify-between border-t border-outline-variant bg-popover py-3">
          <strong className="tabular-nums">{form.watch("currency")} {total.toFixed(2)}</strong>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={ui.closeSheet}>{t("budget.discard")}</Button><Button type="submit" disabled={mutations.create.isPending || mutations.update.isPending}>{t("budget.saveExpense")}</Button></div>
        </div>
      </form>
    </SheetContent>
  </Sheet>;
}
