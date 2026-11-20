import { err, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { getInventoryRows } from "../inventory/inventory.repo";
import { suggestShoppingItems } from "./shopping-matching";
import { addRows, deleteRow, listRows } from "./shopping.repo";
import type { ShoppingItemDto, ShoppingItemInput, ShoppingSuggestion } from "./shopping.schema";

export async function compare(userId: string, items: ShoppingItemInput[]): Promise<Result<ShoppingSuggestion[], AppError>> {
  const rows = await getInventoryRows(userId);
  const now = Date.now();
  return ok(suggestShoppingItems(items, rows
    .filter((row) => row.itemType !== "meal_prep" && (!row.expiresAt || row.expiresAt.getTime() > now))
    .map((row) => ({ name: row.name, unit: row.unit, quantity: Number(row.remainingQuantity) }))));
}

export async function list(userId: string): Promise<Result<ShoppingItemDto[], AppError>> {
  const rows = await listRows(userId);
  return ok(rows.map((row) => ({
    id: row.id, name: row.name, unit: row.unit, quantity: Number(row.quantity),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  })));
}

export async function add(userId: string, items: ShoppingItemInput[]): Promise<Result<ShoppingItemDto[], AppError>> {
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  await addRows(userId, items);
  return list(userId);
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  return await deleteRow(userId, id)
    ? ok({ deleted: true })
    : err({ code: "ITEM_NOT_FOUND", message: "Shopping item not found." });
}
