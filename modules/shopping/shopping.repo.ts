import { and, asc, eq, sql } from "drizzle-orm";
import { getDatabase, shoppingItems } from "@app/db";
import type { ShoppingItemInput } from "./shopping.schema";

function key(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export async function listRows(userId: string) {
  return getDatabase().select().from(shoppingItems)
    .where(eq(shoppingItems.userId, userId)).orderBy(asc(shoppingItems.createdAt));
}

export async function addRows(userId: string, items: ShoppingItemInput[]): Promise<void> {
  const sorted = [...items].sort((a, b) => key(a.name).localeCompare(key(b.name)) || key(a.unit).localeCompare(key(b.unit)));
  await getDatabase().transaction(async (tx) => {
    for (const item of sorted) {
      await tx.insert(shoppingItems).values({
        userId, name: item.name, unit: item.unit,
        nameKey: key(item.name), unitKey: key(item.unit), quantity: String(item.quantity),
      }).onConflictDoUpdate({
        target: [shoppingItems.userId, shoppingItems.nameKey, shoppingItems.unitKey],
        set: {
          quantity: sql`${shoppingItems.quantity} + excluded.quantity`,
          updatedAt: new Date(),
        },
      });
    }
  });
}

export async function deleteRow(userId: string, id: string): Promise<boolean> {
  const rows = await getDatabase().delete(shoppingItems)
    .where(and(eq(shoppingItems.userId, userId), eq(shoppingItems.id, id)))
    .returning({ id: shoppingItems.id });
  return rows.length > 0;
}
