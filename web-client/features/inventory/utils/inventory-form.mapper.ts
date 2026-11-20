import type { InventoryInput, InventoryItem } from "../types";
import { addDays, todayLocal } from "./inventory-formatters";

function expiryAtEndOfDay(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

export function inventoryFormValues(item?: InventoryItem): InventoryInput {
  if (item) {
    return {
      name: item.name,
      itemType: item.itemType,
      recipeId: item.recipeId,
      ingredientId: item.ingredientId,
      storageLocation: item.storageLocation,
      status: item.status,
      initialQuantity: item.initialQuantity,
      remainingQuantity: item.remainingQuantity,
      unit: item.unit,
      preparedAt: item.preparedAt,
      expiresAt: item.expiresAt,
      imageUrl: item.imageUrl,
      caloriesPerUnit: item.caloriesPerUnit,
      proteinPerUnit: item.proteinPerUnit,
      carbsPerUnit: item.carbsPerUnit,
      fatPerUnit: item.fatPerUnit,
      costPerUnit: item.costPerUnit,
      currency: item.currency,
    };
  }
  const expiresAt = expiryAtEndOfDay(addDays(todayLocal(), 3));
  return {
    name: "",
    itemType: "meal_prep",
    recipeId: null,
    ingredientId: null,
    storageLocation: "fridge",
    status: "in_stock",
    initialQuantity: 1,
    remainingQuantity: 1,
    unit: "portion",
    preparedAt: new Date().toISOString(),
    expiresAt,
    imageUrl: null,
    caloriesPerUnit: null,
    proteinPerUnit: null,
    carbsPerUnit: null,
    fatPerUnit: null,
    costPerUnit: null,
    currency: "HUF",
  };
}

export function expiryDateValue(expiresAt: string | null): string {
  return expiresAt?.slice(0, 10) ?? "";
}

export { expiryAtEndOfDay };
