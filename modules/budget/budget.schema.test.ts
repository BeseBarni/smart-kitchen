import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createReceiptInputSchema,
  updateReceiptInputSchema,
} from "./receipts.schema";
import { upsertMonthlyBudgetInputSchema } from "./budget.schema";

const item = {
  name: "Milk",
  categoryId: "10000000-0000-4000-8000-000000000001",
  amount: 499,
};

test("receipt contract requires exactly one merchant selector and at least one categorized line", () => {
  const receipt = {
    merchantName: "Aldi",
    purchasedAt: "2026-01-03T11:00:00.000Z",
    currency: "HUF",
    items: [item],
  };
  assert.equal(createReceiptInputSchema.safeParse(receipt).success, true);
  assert.equal(createReceiptInputSchema.safeParse({ ...receipt, merchantId: item.categoryId }).success, false);
  assert.equal(createReceiptInputSchema.safeParse({ ...receipt, items: [] }).success, false);
  assert.equal(updateReceiptInputSchema.safeParse({ merchantId: item.categoryId, merchantName: "Aldi" }).success, false);
});

test("monthly budget contract rejects duplicate category limits", () => {
  const input = {
    totalLimitAmount: 50_000,
    currency: "HUF",
    categoryLimits: [
      { categoryId: item.categoryId, limitAmount: 20_000 },
      { categoryId: item.categoryId, limitAmount: 30_000 },
    ],
  };
  assert.equal(upsertMonthlyBudgetInputSchema.safeParse(input).success, false);
});
