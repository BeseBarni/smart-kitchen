import { z } from "zod";

export const inventoryItemSchema = z
  .object({
    id: z.string().uuid().describe("Inventory item identifier."),
    userId: z.string().describe("The external authentication identity ID."),
    name: z.string().min(1).describe("Inventory item name."),
    itemType: z.enum(["meal_prep", "ingredient", "packaged"]).describe("Kind of inventory item."),
    recipeId: z.string().uuid().nullable().describe("Associated recipe identifier, if any."),
    ingredientId: z.string().uuid().nullable().describe("Associated ingredient identifier, if any."),
    storageLocation: z.enum(["fridge", "freezer", "pantry"]).describe("Where the item is stored."),
    status: z.enum(["in_stock", "consumed", "discarded"]).describe("Current inventory status."),
    initialQuantity: z.number().nonnegative().describe("Quantity when the item was recorded."),
    remainingQuantity: z.number().nonnegative().describe("Quantity remaining."),
    unit: z.string().describe("Unit used for the inventory quantities."),
    preparedAt: z.iso.datetime().nullable().describe("Preparation time, if applicable."),
    expiresAt: z.iso.datetime().nullable().describe("Expiration time, if known."),
    imageUrl: z.string().url().nullable().describe("Image URL, if available."),
    caloriesPerUnit: z.number().nonnegative().nullable().describe("Calories per inventory unit."),
    proteinPerUnit: z.number().nonnegative().nullable().describe("Protein grams per inventory unit."),
    carbsPerUnit: z.number().nonnegative().nullable().describe("Carbohydrate grams per inventory unit."),
    fatPerUnit: z.number().nonnegative().nullable().describe("Fat grams per inventory unit."),
    costPerUnit: z.number().nonnegative().nullable().describe("Cost per inventory unit."),
    currency: z.string().describe("ISO currency code used for cost."),
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Update time in ISO-8601 format."),
  })
  .describe("A stored ingredient, packaged item, or prepared meal batch.");

export const createInventoryItemSchema = inventoryItemSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .describe("Input for recording an inventory item.");

export const updateInventoryItemSchema = createInventoryItemSchema
  .partial()
  .describe("Fields that can be changed for an inventory item.");

export const listInventoryQuerySchema = z
  .object({
    storageLocation: z.enum(["fridge", "freezer", "pantry"]).optional().describe("Storage filter."),
    status: z.enum(["in_stock", "consumed", "discarded"]).default("in_stock").describe("Status filter."),
    itemType: z.enum(["meal_prep", "ingredient", "packaged"]).optional().describe("Item type filter."),
    search: z.string().optional().describe("Text to match against item names."),
    sortBy: z.enum(["expiresAt", "name", "createdAt"]).default("expiresAt").describe("Result order."),
    limit: z.coerce.number().int().positive().max(100).default(50).describe("Maximum results."),
    offset: z.coerce.number().int().nonnegative().default(0).describe("Results to skip."),
  })
  .describe("Inventory listing filters.");

export const expiringInventoryQuerySchema = z
  .object({
    withinHours: z.coerce.number().positive().max(8760).default(48).describe("Expiry window in hours."),
  })
  .describe("Expiring inventory query.");

export const inventorySummarySchema = z
  .object({
    totalItems: z.number().int().nonnegative().describe("Number of in-stock inventory records."),
    totalQuantity: z.number().nonnegative().describe("Total remaining quantity."),
    byLocation: z
      .object({
        fridge: z.object({ items: z.number().int().nonnegative(), quantity: z.number().nonnegative() }),
        freezer: z.object({ items: z.number().int().nonnegative(), quantity: z.number().nonnegative() }),
        pantry: z.object({ items: z.number().int().nonnegative(), quantity: z.number().nonnegative() }),
      })
      .describe("Remaining quantity by location."),
    expiringSoonCount: z.number().int().nonnegative().describe("Items expiring within 48 hours."),
  })
  .describe("Aggregate inventory summary.");

export const adjustInventoryInputSchema = z
  .object({ delta: z.number().finite().refine((value) => value !== 0).describe("Quantity adjustment.") })
  .describe("Inventory quantity adjustment.");

export const consumeInventoryInputSchema = z
  .object({
    quantity: z.number().positive().describe("Amount to consume."),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("Meal category."),
    eatenAt: z.iso.datetime().optional().describe("Consumption timestamp."),
  })
  .describe("Input for consuming inventory and recording a meal.");

export const inventoryItemIdSchema = z.string().uuid().describe("Inventory item identifier.");

export type InventoryItemDto = z.infer<typeof inventoryItemSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventoryInputSchema>;
export type ConsumeInventoryInput = z.infer<typeof consumeInventoryInputSchema>;
