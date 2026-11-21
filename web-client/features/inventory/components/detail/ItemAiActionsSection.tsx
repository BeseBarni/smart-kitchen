"use client";

import { useRouter } from "next/navigation";
import type { InventoryDetail } from "../../types";
import { useInventoryUiStore } from "../../stores/inventory-ui.store";
import { queueNewChatPrompt } from "../../../chat";
import { useText } from "@/lib/i18n";

interface Props { item: InventoryDetail }

export function ItemAiActionsSection({ item }: Props): React.JSX.Element {
  const router = useRouter();
  const { t } = useText();
  const close = useInventoryUiStore((state) => state.closeItemDetail);
  const startChat = (prompt: string): void => {
    close();
    queueNewChatPrompt(prompt);
    router.push("/chat");
  };
  const context = t("inventory.aiPromptContext", {
    name: item.name,
    storage: t(`inventory.${item.storageLocation}`),
    quantity: item.remainingQuantity,
    unit: item.unit,
  });
  const expiringSoon = item.freshness.daysRemaining !== null && item.freshness.daysRemaining <= 2;
  return (
    <section className="space-y-2">
      <h3 className="text-title-sm">{t("inventory.detailAiActions")}</h3>
      <button type="button" className="min-h-11 w-full rounded-xl border border-border px-3 text-left" onClick={() => startChat(`${context} ${t("inventory.aiAboutItem")}`)}>
        {t("inventory.aiAboutItem")}
      </button>
      <button type="button" className="min-h-11 w-full rounded-xl border border-border px-3 text-left" onClick={() => startChat(`${context} ${t("inventory.aiRandomRecipe")}`)}>
        {t("inventory.aiRandomRecipe")}
      </button>
      {expiringSoon && (
        <button type="button" className="min-h-11 w-full rounded-xl border border-border px-3 text-left" onClick={() => startChat(`${context} ${t("inventory.aiRescueMeal")}`)}>
          {t("inventory.aiRescueMeal")}
        </button>
      )}
    </section>
  );
}
