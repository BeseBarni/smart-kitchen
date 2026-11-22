"use client";

import { useText } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useBudgetUiStore } from "../stores/budget-ui.store";
import { useBudgetMutations } from "../hooks/use-budget-mutations";

export function DeleteReceiptDialog(): React.JSX.Element {
  const { t } = useText();
  const ui = useBudgetUiStore();
  const mutations = useBudgetMutations();
  const candidate = ui.deleteCandidate;
  if (!candidate) return <></>;
  const close = (): void => ui.setDeleteCandidate(null);
  return <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-end justify-center bg-on-surface/40 p-4">
    <div className="w-full max-w-[430px] rounded-2xl bg-surface-container-lowest p-4">
      <h2 className="text-headline-md">{t("budget.deleteQuestion", { title: candidate.title })}</h2>
      <p className="mt-2 text-body-md text-muted-foreground">{t("budget.deleteDescription", { count: candidate.itemCount })}</p>
      <div className="mt-4 flex gap-2"><Button type="button" variant="outline" className="h-12 flex-1" onClick={close}>{t("common.cancel")}</Button>
        <Button type="button" className="h-12 flex-1 bg-destructive" onClick={() => { mutations.remove.mutate({ id: candidate.id }); close(); ui.closeReceipt(); }}>{t("budget.deleteReceipt")}</Button></div>
    </div>
  </div>;
}
