import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("monthly summary inherits the prior budget and keeps currency totals separate", async () => {
  const budgets = await import("./budget.repo");
  const spending = await import("./budget-spend.repo");
  const categories = await import("./expense-categories.service");
  const budgetRow = {
    id: "20000000-0000-4000-8000-000000000001",
    userId: "30000000-0000-4000-8000-000000000001",
    yearMonth: "2026-03",
    totalLimitAmount: "100.00",
    currency: "HUF",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  };
  const budgetMock = mock.module("./budget.repo", {
    namedExports: {
      ...budgets,
      findBudgetForMonth: async () => ({ success: true, data: { budget: budgetRow, limits: [] } }),
    },
  });
  const spendingMock = mock.module("./budget-spend.repo", {
    namedExports: {
      ...spending,
      getSpendAggregates: async () => ({
        success: true,
        data: {
          categoryRows: [
            {
              categoryId: "40000000-0000-4000-8000-000000000001",
              slug: "food",
              label: "Food",
              i18nKey: "budget.categories.food",
              iconName: "ShoppingBasket",
              colorToken: "positive",
              currency: "HUF",
              spentAmount: "80.00",
              itemCount: 1,
            },
            {
              categoryId: "40000000-0000-4000-8000-000000000001",
              slug: "food",
              label: "Food",
              i18nKey: "budget.categories.food",
              iconName: "ShoppingBasket",
              colorToken: "positive",
              currency: "EUR",
              spentAmount: "20.00",
              itemCount: 1,
            },
          ],
          merchantRows: [
            { merchantId: "50000000-0000-4000-8000-000000000001", name: "Aldi", currency: "HUF", spentAmount: "80.00", receiptCount: 1 },
            { merchantId: "50000000-0000-4000-8000-000000000001", name: "Aldi", currency: "EUR", spentAmount: "20.00", receiptCount: 1 },
          ],
          receiptCount: 2,
          itemCount: 2,
        },
      }),
    },
  });
  const categoryMock = mock.module("./expense-categories.service", {
    namedExports: {
      ...categories,
      listAvailable: async () => ({
        success: true,
        data: [{
          id: "40000000-0000-4000-8000-000000000001",
          userId: null,
          slug: "food",
          label: "Food",
          i18nKey: "budget.categories.food",
          iconName: "ShoppingBasket",
          colorToken: "positive",
          sortOrder: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }],
      }),
    },
  });
  try {
    const service = await import("./budget.service");
    const result = await service.getMonthlySummary("30000000-0000-4000-8000-000000000001", {
      yearMonth: "2026-04",
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.isInherited, true);
    assert.equal(result.data.totalSpent, 80);
    assert.equal(result.data.status, "near_limit");
    assert.deepEqual(result.data.spendByCurrency, [
      { currency: "EUR", amount: 20 },
      { currency: "HUF", amount: 80 },
    ]);
  } finally {
    categoryMock.restore();
    spendingMock.restore();
    budgetMock.restore();
  }
});
