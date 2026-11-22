import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createReceiptInputSchema,
  commitScannedReceiptInputSchema,
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

test("scanned receipts allow an unknown merchant but reject conflicting selectors", () => {
  const receipt = {
    purchasedAt: "2026-01-03T11:00:00.000Z",
    currency: "HUF",
    items: [{ ...item, quantity: 1, addToInventory: false }],
  };
  assert.equal(commitScannedReceiptInputSchema.safeParse(receipt).success, true);
  assert.equal(commitScannedReceiptInputSchema.safeParse({ ...receipt, merchantName: "" }).success, false);
  assert.equal(commitScannedReceiptInputSchema.safeParse({ ...receipt, merchantName: "Aldi", merchantId: item.categoryId }).success, false);
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
