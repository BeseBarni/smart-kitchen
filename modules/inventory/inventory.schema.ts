import { z } from "zod";
import { rawTagSchema, shelfLifeDaysSchema, tagDtoSchema } from "../tags/tags.schema";
import { resolvedImageUrlsSchema, stockImageKindSchema } from "../mealdb/mealdb.schema";

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
    imageAssetId: z.string().uuid().nullable().optional().describe("Uploaded media asset, if available."),
    stockImageKind: stockImageKindSchema.nullable().optional().describe("The normalized TheMealDB stock image kind."),
    stockImageName: z.string().trim().min(1).max(255).nullable().optional().describe("The normalized TheMealDB stock image name."),
    imageUrls: resolvedImageUrlsSchema.optional().describe("Resolved small, medium, and large image URLs."),
    caloriesPerUnit: z.number().nonnegative().nullable().describe("Calories per inventory unit."),
    proteinPerUnit: z.number().nonnegative().nullable().describe("Protein grams per inventory unit."),
    carbsPerUnit: z.number().nonnegative().nullable().describe("Carbohydrate grams per inventory unit."),
    fatPerUnit: z.number().nonnegative().nullable().describe("Fat grams per inventory unit."),
    fiberPerUnit: z.number().nonnegative().nullable().describe("Fiber grams per inventory unit."),
    costPerUnit: z.number().nonnegative().nullable().describe("Cost per inventory unit."),
    currency: z.string().describe("ISO currency code used for cost."),
    shelfLifeDays: shelfLifeDaysSchema
      .optional()
      .describe("Typical shelf life in days by storage method."),
    tags: z.array(tagDtoSchema).max(3)
      .optional()
      .describe("Up to three persisted attribute chips."),
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Update time in ISO-8601 format."),
  })
  .describe("A stored ingredient, packaged item, or prepared meal batch.");

export const createInventoryItemSchema = inventoryItemSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .extend({
    stockImageKind: stockImageKindSchema.nullable().optional(),
    stockImageName: z.string().trim().min(1).max(255).nullable().optional(),
    fiberPerUnit: z.number().nonnegative().nullable().optional().describe("Fiber grams per unit, if known."),
    shelfLifeDays: shelfLifeDaysSchema.optional().describe("Typical shelf life in days by storage method."),
    tags: z.array(rawTagSchema).max(3).optional().describe("Up to three attribute tags to resolve."),
  })
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

export type InventorySummaryDto = z.infer<typeof inventorySummarySchema>;

export const adjustInventoryInputSchema = z
  .object({ delta: z.number().finite().refine((value) => value !== 0).describe("Quantity adjustment.") })
  .describe("Inventory quantity adjustment.");

export const estimatedMacrosPerUnitSchema = z.object({
  calories: z.number().nonnegative().nullable().describe("Estimated calories per inventory unit."),
  proteinG: z.number().nonnegative().nullable().describe("Estimated protein grams per inventory unit."),
  carbsG: z.number().nonnegative().nullable().describe("Estimated carbohydrate grams per inventory unit."),
  fatG: z.number().nonnegative().nullable().describe("Estimated fat grams per inventory unit."),
  fiberG: z.number().nonnegative().nullable().describe("Estimated fiber grams per inventory unit."),
}).strict().describe("Estimated nutrition for one unit of the recorded quantity; null when unknown.");

export const batchInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).describe("Inventory item name."),
    quantity: z.number().positive().describe("Initial and remaining quantity."),
    unit: z.string().trim().min(1).describe("Quantity unit."),
    storageLocation: z.enum(["fridge", "freezer", "pantry"]).describe("Where the item is stored."),
    expiresAt: z.iso.datetime().nullable().optional().describe("Optional expiration timestamp."),
    costPerUnit: z.number().nonnegative().nullable().optional().describe("Optional unit cost."),
    currency: z.string().trim().min(1).max(8).optional().describe("Optional ISO-style currency code."),
    estimatedMacrosPerUnit: estimatedMacrosPerUnitSchema.nullable().optional()
      .describe("Estimated nutrition per recorded unit, if available."),
    shelfLifeDays: shelfLifeDaysSchema.optional()
      .describe("Typical shelf life in days by storage method."),
    tags: z.array(rawTagSchema).max(3).optional()
      .describe("Up to three attribute tags to resolve."),
    imageAssetId: z.string().uuid().nullable().optional(),
    stockImageKind: stockImageKindSchema.nullable().optional(),
    stockImageName: z.string().trim().min(1).max(255).nullable().optional(),
  })
  .strict()
  .describe("One item in a receipt or photo inventory batch.");

export const batchCreateInventoryInputSchema = z
  .object({
    items: z.array(batchInventoryItemSchema).min(1).max(100).describe("Items to add atomically."),
  })
  .strict()
  .describe("Atomic batch inventory input.");

export const batchCreateInventoryOutputSchema = z
  .object({
    items: z.array(inventoryItemSchema).describe("Created inventory records."),
  })
  .strict()
  .describe("Created inventory records.");

export const consumeInventoryInputSchema = z
  .object({
    quantity: z.number().positive().describe("Amount to consume."),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("Meal category."),
    eatenAt: z.iso.datetime().optional().describe("Consumption timestamp."),
    fiberG: z.number().nonnegative().optional().describe("Fiber grams for the consumed quantity, when known."),
    requireFiber: z.boolean().optional().describe("Reject consumption if fiber is unknown."),
  })
  .describe("Input for consuming inventory and recording a meal.");

export const inventoryItemIdSchema = z.string().uuid().describe("Inventory item identifier.");

export const inventoryFreshnessSchema = z.object({
  msRemaining: z.number().finite().nullable().describe("Milliseconds until expiry."),
  daysRemaining: z.number().finite().nullable().describe("Days until expiry."),
  isExpired: z.boolean().describe("Whether the item is already expired."),
  shelfLifeDaysForCurrentLocation: z.number().int().positive().nullable()
    .describe("Typical shelf life for the current storage method."),
}).strict();

export const linkedRecipeIngredientSchema = z.object({
  displayName: z.string().min(1).describe("Ingredient name."),
  quantity: z.number().positive().describe("Required quantity."),
  unit: z.string().min(1).describe("Quantity unit."),
  notes: z.string().nullable().describe("Preparation notes."),
  ingredientId: z.string().uuid().nullable().describe("Linked ingredient identifier."),
}).strict();

export const linkedRecipeDetailSchema = z.object({
  id: z.string().uuid().describe("Recipe identifier."),
  title: z.string().min(1).describe("Recipe title."),
  description: z.string().nullable().describe("Recipe description."),
  prepTimeMin: z.number().int().nonnegative().nullable().describe("Preparation time."),
  cookTimeMin: z.number().int().nonnegative().nullable().describe("Cooking time."),
  servings: z.number().positive().describe("Recipe servings."),
  ingredients: z.array(linkedRecipeIngredientSchema).describe("Ordered recipe ingredients."),
}).strict();

export const inventoryDetailSchema = inventoryItemSchema.extend({
  freshness: inventoryFreshnessSchema,
  recipe: linkedRecipeDetailSchema.nullable(),
}).strict().describe("Complete inventory item detail modal DTO.");

export const switchStorageLocationSchema = z.object({
  storageLocation: z.enum(["fridge", "freezer", "pantry"]).describe("New storage method."),
  recalculateExpiry: z.boolean().default(true).describe("Whether to recalculate expiry."),
}).strict().describe("Optimistic storage switch request.");

export type InventoryItemDto = z.infer<typeof inventoryItemSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventoryInputSchema>;
export type ConsumeInventoryInput = z.infer<typeof consumeInventoryInputSchema>;
export type BatchInventoryItemInput = z.infer<typeof batchInventoryItemSchema>;
export type BatchCreateInventoryInput = z.infer<typeof batchCreateInventoryInputSchema>;
export type BatchCreateInventoryOutput = z.infer<typeof batchCreateInventoryOutputSchema>;
export type InventoryDetailDto = z.infer<typeof inventoryDetailSchema>;
export type SwitchStorageLocationInput = z.infer<typeof switchStorageLocationSchema>;
