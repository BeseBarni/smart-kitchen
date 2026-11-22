import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateReceiptInput, UpdateReceiptInput, UpsertMonthlyBudgetInput } from "@app/modules/schemas";
import { budgetApi } from "../api/budget.api";
import { budgetKeys } from "../api/budget.keys";
import { getText } from "@/lib/i18n";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";
import { insertOptimisticReceipt, replaceOptimisticReceipt } from "../utils/budget-cache.utils";
import { patchDeleteReceipt, patchUpsertBudget, patchUpdateReceipt } from "../utils/budget-mutation-cache.utils";

export function useBudgetMutations() {
  const client = useQueryClient();
  const create = useMutation({
    mutationKey: ["budget", "receipts", "create"],
    mutationFn: budgetApi.createReceipt,
    onMutate: async (input: CreateReceiptInput) => {
      const context = await snapshotQueryCaches(client, [budgetKeys.all]);
      const optimistic = insertOptimisticReceipt(client, input);
      return { ...context, optimisticId: optimistic.id };
    },
    onSuccess: (receipt, _input, context) => {
      replaceOptimisticReceipt(client, context.optimisticId, receipt);
      toast.success(getText("budget.receiptCreated"));
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["budget", "receipts", "create"], [budgetKeys.all, ["merchants"]]);
    },
  });
  const update = useMutation({
    mutationKey: ["budget", "receipts", "update"],
    mutationFn: ({ id, input }: { id: string; input: UpdateReceiptInput }) => budgetApi.updateReceipt(id, input),
    onMutate: async ({ id, input }) => {
      const context = await snapshotQueryCaches(client, [budgetKeys.all]);
      patchUpdateReceipt(client, id, input);
      return context;
    },
    onSuccess: (receipt) => {
      client.setQueryData(budgetKeys.receiptDetail(receipt.id), receipt);
      toast.success(getText("budget.receiptUpdated"));
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["budget", "receipts", "update"], [budgetKeys.all]);
    },
  });
  const remove = useMutation({
    mutationKey: ["budget", "receipts", "delete"],
    mutationFn: ({ id }: { id: string }) => budgetApi.deleteReceipt(id),
    onMutate: async ({ id }) => {
      const context = await snapshotQueryCaches(client, [budgetKeys.all]);
      patchDeleteReceipt(client, id);
      return context;
    },
    onSuccess: () => toast.success(getText("budget.receiptDeleted")),
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["budget", "receipts", "delete"], [budgetKeys.all]);
    },
  });
  const upsertBudget = useMutation({
    mutationKey: ["budget", "settings", "upsert"],
    mutationFn: ({ yearMonth, input }: { yearMonth: string; input: UpsertMonthlyBudgetInput }) =>
      budgetApi.upsertBudget(yearMonth, input),
    onMutate: async ({ yearMonth, input }) => {
      const context = await snapshotQueryCaches(client, [budgetKeys.summary(yearMonth), budgetKeys.all]);
      patchUpsertBudget(client, yearMonth, input);
      return context;
    },
    onSuccess: (summary) => {
      client.setQueryData(budgetKeys.summary(summary.yearMonth), summary);
      toast.success(getText("budget.budgetUpdated"));
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["budget", "settings", "upsert"], [budgetKeys.all]);
    },
  });
  return { create, update, remove, upsertBudget };
}
