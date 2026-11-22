import assert from "node:assert/strict";
import { test } from "node:test";

const databaseUrl = process.env.BUDGET_TEST_DATABASE_URL;
const userA = process.env.BUDGET_TEST_USER_A_ID;
const userB = process.env.BUDGET_TEST_USER_B_ID;
const enabled = Boolean(
  databaseUrl &&
  userA &&
  userB &&
  process.env.BUDGET_TEST_CONFIRM_DISPOSABLE === "YES",
);

test("receipt and budget workflow preserves totals, currency groups, and tenant isolation", {
  skip: !enabled,
}, async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl!;
  const { closeDatabase, db, monthlyBudgets } = await import("@app/db");
  const categoriesService = await import("./expense-categories.service");
  const merchantsService = await import("./merchants.service");
  const receiptReadService = await import("./receipts-read.service");
  const receiptWriteService = await import("./receipts-write.service");
  const budgetService = await import("./budget.service");
  const { and, eq, inArray } = await import("drizzle-orm");
  const receiptIds: string[] = [];
  let merchantId: string | undefined;
  try {
    const categories = await categoriesService.listAvailable(userA!);
    assert.equal(categories.success, true);
    if (!categories.success) return;
    const food = categories.data.find((category) => category.slug === "food");
    const household = categories.data.find((category) => category.slug === "household");
    assert.ok(food);
    assert.ok(household);

    const first = await receiptWriteService.create(userA!, {
      merchantName: "Aldi",
      source: "scanned",
      purchasedAt: "9998-12-15T12:00:00.000Z",
      currency: "HUF",
      items: [
        { name: "Milk", categoryId: food.id, amount: 1.1 },
        { name: "Chicken", categoryId: food.id, amount: 1.25 },
        { name: "Dish soap", categoryId: household.id, amount: 3.4 },
      ],
    });
    assert.equal(first.success, true);
    if (!first.success) return;
    receiptIds.push(first.data.id);
    merchantId = first.data.merchant?.id;
    assert.equal(first.data.totalAmount, 5.75);
    assert.equal(first.data.itemCount, 3);

    const second = await receiptWriteService.create(userA!, {
      merchantName: "ALDI ",
      source: "manual",
      purchasedAt: "9998-12-16T12:00:00.000Z",
      currency: "HUF",
      items: [{ name: "Apples", categoryId: food.id, amount: 0.25 }],
    });
    assert.equal(second.success, true);
    if (!second.success) return;
    receiptIds.push(second.data.id);
    assert.equal(second.data.merchant?.id, merchantId);

    const recommendations = await merchantsService.list(userA!, { sort: "recommended", limit: 20 });
    assert.equal(recommendations.success, true);
    if (recommendations.success) {
      assert.equal(recommendations.data[0]?.name, "Aldi");
      assert.ok(recommendations.data[0]!.receiptCount >= 2);
    }

    const upserted = await budgetService.upsertMonthlyBudget(userA!, "9998-12", {
      totalLimitAmount: 100,
      currency: "HUF",
      categoryLimits: [
        { categoryId: food.id, limitAmount: 50 },
        { categoryId: household.id, limitAmount: 50 },
      ],
    });
    assert.equal(upserted.success, true);
    const beforeUpdate = await budgetService.getMonthlySummary(userA!, { yearMonth: "9998-12" });
    assert.equal(beforeUpdate.success, true);
    if (beforeUpdate.success) {
      assert.equal(beforeUpdate.data.totalSpent, 6);
      assert.equal(beforeUpdate.data.categoryBreakdown.find((entry) => entry.categoryId === food.id)?.spentAmount, 2.6);
      assert.equal(beforeUpdate.data.categoryBreakdown.find((entry) => entry.categoryId === household.id)?.spentAmount, 3.4);
    }

    const updated = await receiptWriteService.update(userA!, first.data.id, {
      items: [
        { name: "Milk", categoryId: food.id, amount: 1.1 },
        { name: "Dish soap", categoryId: household.id, amount: 3.4 },
      ],
    });
    assert.equal(updated.success, true);
    if (updated.success) assert.equal(updated.data.totalAmount, 4.5);
    const afterUpdate = await budgetService.getMonthlySummary(userA!, { yearMonth: "9998-12" });
    assert.equal(afterUpdate.success, true);
    if (afterUpdate.success) {
      assert.equal(afterUpdate.data.totalSpent, 4.75);
      assert.equal(afterUpdate.data.categoryBreakdown.find((entry) => entry.categoryId === food.id)?.spentAmount, 1.35);
    }

    const inheritedSetup = await budgetService.upsertMonthlyBudget(userA!, "9998-10", {
      totalLimitAmount: 200,
      currency: "HUF",
      categoryLimits: [],
    });
    assert.equal(inheritedSetup.success, true);
    const inherited = await budgetService.getMonthlySummary(userA!, { yearMonth: "9998-11" });
    assert.equal(inherited.success, true);
    if (inherited.success) assert.equal(inherited.data.isInherited, true);

    const crossUserRead = await receiptReadService.getReceiptDetail(userB!, first.data.id);
    assert.equal(crossUserRead.success, false);
    const crossUserUpdate = await receiptWriteService.update(userB!, first.data.id, {
      title: "Not allowed",
    });
    assert.equal(crossUserUpdate.success, false);
    const crossUserDelete = await receiptWriteService.remove(userB!, first.data.id);
    assert.equal(crossUserDelete.success, false);
    const crossUserBudget = await budgetService.getMonthlySummary(userB!, { yearMonth: "9998-12" });
    assert.equal(crossUserBudget.success, true);
    if (crossUserBudget.success) assert.equal(crossUserBudget.data.budget, null);
    const crossUserAttach = await receiptWriteService.create(userB!, {
      merchantId: merchantId!,
      source: "manual",
      purchasedAt: "9998-12-17T12:00:00.000Z",
      currency: "HUF",
      items: [{ name: "Unauthorized", categoryId: food.id, amount: 1 }],
    });
    assert.equal(crossUserAttach.success, false);
  } finally {
    try {
      for (const id of receiptIds) await receiptWriteService.remove(userA!, id);
      if (merchantId) await merchantsService.remove(userA!, merchantId);
      await db.delete(monthlyBudgets).where(and(
        eq(monthlyBudgets.userId, userA!),
        inArray(monthlyBudgets.yearMonth, ["9998-10", "9998-12"]),
      ));
    } finally {
      await closeDatabase();
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});
