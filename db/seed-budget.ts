import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "./index";
import {
  authUsers,
  expenseCategories,
  merchants,
  monthlyBudgetCategoryLimits,
  monthlyBudgets,
  receiptItems,
  receipts,
} from "./schema";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"), quiet: true });

const receiptIds = [
  "80000000-0000-4000-8000-000000000001",
  "80000000-0000-4000-8000-000000000002",
  "80000000-0000-4000-8000-000000000003",
];

async function seedBudget(): Promise<void> {
  const userId = process.env.SEED_USER_ID;
  if (!userId) throw new Error("SEED_USER_ID is required to seed budget examples.");
  const database = getDatabase();
  try {
    await database.transaction(async (tx) => {
      const [seedUser] = await tx.select({ id: authUsers.id }).from(authUsers)
        .where(eq(authUsers.id, userId)).limit(1);
      if (!seedUser) throw new Error("SEED_USER_ID does not match an existing Neon Auth user.");

      const canonicalCategories = [
        { slug: "food", label: "Food", i18nKey: "budget.categories.food", iconName: "ShoppingBasket", colorToken: "positive", sortOrder: 0 },
        { slug: "household", label: "Household", i18nKey: "budget.categories.household", iconName: "House", colorToken: "primary", sortOrder: 1 },
        { slug: "entertainment", label: "Entertainment", i18nKey: "budget.categories.entertainment", iconName: "Ticket", colorToken: "warning", sortOrder: 2 },
        { slug: "other", label: "Other", i18nKey: "budget.categories.other", iconName: "Ellipsis", colorToken: "neutral", sortOrder: 3 },
      ];
      for (const category of canonicalCategories) {
        await tx.insert(expenseCategories).values({ ...category, userId: null }).onConflictDoNothing();
      }
      const allCategories = await tx.select().from(expenseCategories).where(and(
        isNull(expenseCategories.userId),
        inArray(expenseCategories.slug, canonicalCategories.map((category) => category.slug)),
      ));
      const categoryBySlug = new Map(allCategories.map((category) => [category.slug, category]));
      const food = categoryBySlug.get("food");
      const household = categoryBySlug.get("household");
      const entertainment = categoryBySlug.get("entertainment");
      if (!food || !household || !entertainment) {
        throw new Error("Canonical budget categories could not be resolved.");
      }

      const merchantFixtures = [
        { name: "Aldi", normalizedName: "aldi", defaultCategoryId: food.id },
        { name: "DM", normalizedName: "dm", defaultCategoryId: household.id },
        { name: "Lidl", normalizedName: "lidl", defaultCategoryId: food.id },
      ];
      for (const merchant of merchantFixtures) {
        await tx.insert(merchants).values({ userId, ...merchant }).onConflictDoUpdate({
          target: [merchants.userId, merchants.normalizedName],
          set: { name: merchant.name, defaultCategoryId: merchant.defaultCategoryId, updatedAt: new Date() },
        });
      }
      const merchantRows = await tx.select().from(merchants).where(and(
        eq(merchants.userId, userId),
        inArray(merchants.normalizedName, merchantFixtures.map((merchant) => merchant.normalizedName)),
      ));
      const merchantByName = new Map(merchantRows.map((merchant) => [merchant.normalizedName, merchant]));
      const now = new Date();
      const receiptFixtures = [
        {
          id: receiptIds[0]!,
          merchant: merchantByName.get("aldi"),
          source: "scanned" as const,
          title: "Weekly groceries",
          purchasedAt: new Date(now.getTime() - 3 * 86_400_000),
          items: [
            { id: "90000000-0000-4000-8000-000000000001", categoryId: food.id, name: "Milk", quantity: "1.000", unit: "l", amount: "499.00" },
            { id: "90000000-0000-4000-8000-000000000002", categoryId: food.id, name: "Chicken breast", quantity: "1.000", unit: "pack", amount: "1299.00" },
            { id: "90000000-0000-4000-8000-000000000003", categoryId: household.id, name: "Dish soap", quantity: "1.000", unit: "pcs", amount: "699.00" },
          ],
        },
        {
          id: receiptIds[1]!,
          merchant: merchantByName.get("dm"),
          source: "manual" as const,
          title: "Household supplies",
          purchasedAt: new Date(now.getTime() - 2 * 86_400_000),
          items: [
            { id: "90000000-0000-4000-8000-000000000004", categoryId: household.id, name: "Shampoo", quantity: "1.000", unit: "pcs", amount: "1599.00" },
            { id: "90000000-0000-4000-8000-000000000005", categoryId: household.id, name: "Laundry detergent", quantity: "1.000", unit: "pack", amount: "1899.00" },
          ],
        },
        {
          id: receiptIds[2]!,
          merchant: merchantByName.get("lidl"),
          source: "manual" as const,
          title: "Fruit and bread",
          purchasedAt: new Date(now.getTime() - 86_400_000),
          items: [
            { id: "90000000-0000-4000-8000-000000000006", categoryId: food.id, name: "Apples", quantity: "1.000", unit: "kg", amount: "499.00" },
            { id: "90000000-0000-4000-8000-000000000007", categoryId: food.id, name: "Wholegrain bread", quantity: "1.000", unit: "pcs", amount: "299.00" },
          ],
        },
      ];
      for (const receipt of receiptFixtures) {
        if (!receipt.merchant) throw new Error("A demo merchant could not be resolved.");
        await tx.insert(receipts).values({
          id: receipt.id,
          userId,
          merchantId: receipt.merchant.id,
          source: receipt.source,
          title: receipt.title,
          purchasedAt: receipt.purchasedAt,
          currency: "HUF",
          notes: null,
        }).onConflictDoUpdate({
          target: receipts.id,
          set: {
            userId,
            merchantId: receipt.merchant.id,
            source: receipt.source,
            title: receipt.title,
            purchasedAt: receipt.purchasedAt,
            currency: "HUF",
            updatedAt: now,
          },
        });
      }
      await tx.delete(receiptItems).where(inArray(receiptItems.receiptId, receiptIds));
      for (const receipt of receiptFixtures) {
        await tx.insert(receiptItems).values(receipt.items.map((item, sortOrder) => ({
          id: item.id,
          receiptId: receipt.id,
          categoryId: item.categoryId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          amount: item.amount,
          sortOrder,
        })));
      }

      const date = new Date(now);
      const yearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const [budget] = await tx.insert(monthlyBudgets).values({
        userId,
        yearMonth,
        totalLimitAmount: "80000.00",
        currency: "HUF",
      }).onConflictDoUpdate({
        target: [monthlyBudgets.userId, monthlyBudgets.yearMonth],
        set: { totalLimitAmount: "80000.00", currency: "HUF", updatedAt: now },
      }).returning();
      if (!budget) throw new Error("Demo monthly budget could not be resolved.");
      await tx.delete(monthlyBudgetCategoryLimits)
        .where(eq(monthlyBudgetCategoryLimits.monthlyBudgetId, budget.id));
      await tx.insert(monthlyBudgetCategoryLimits).values([
        { monthlyBudgetId: budget.id, categoryId: food.id, limitAmount: "50000.00" },
        { monthlyBudgetId: budget.id, categoryId: household.id, limitAmount: "20000.00" },
        { monthlyBudgetId: budget.id, categoryId: entertainment.id, limitAmount: "10000.00" },
      ]);
    });
    console.info("Budget seed completed.");
  } finally {
    await closeDatabase();
  }
}

await seedBudget();
