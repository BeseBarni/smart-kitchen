import { inventoryService } from "@app/modules";
import { batchCreateInventoryInputSchema, batchCreateInventoryOutputSchema, generatedShelfLifeDaysSchema, inventoryItemSchema, mealLogSchema, type InventoryItemDto } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";

const itemSummary = (item: InventoryItemDto) => ({
  id: item.id,
  name: item.name,
  quantity: item.remainingQuantity,
  unit: item.unit,
  location: item.storageLocation,
  stockImageKind: item.stockImageKind,
  stockImageName: item.stockImageName,
  imageUrl: item.imageUrl,
});

const addInput = z.object({
  name: z.string().min(1).describe("Name of the item to record."),
  itemType: z.enum(["meal_prep", "ingredient", "packaged"]).describe("Kind of item."),
  recipeId: z.string().uuid().nullable().describe("Linked recipe ID, or null."),
  ingredientId: z.string().uuid().nullable().describe("Linked ingredient ID, or null."),
  storageLocation: z.enum(["fridge", "freezer", "pantry"]).describe("Where the item is stored."),
  status: z.enum(["in_stock", "consumed", "discarded"]).describe("Initial stock status."),
  initialQuantity: z.number().nonnegative().describe("Recorded initial quantity."),
  remainingQuantity: z.number().nonnegative().describe("Quantity currently available."),
  unit: z.string().min(1).describe("Quantity unit."),
  preparedAt: z.iso.datetime().nullable().describe("Preparation time or null."),
  expiresAt: z.iso.datetime().nullable().describe("Known label or user-provided expiry time; null to estimate from shelf life."),
  imageUrl: z.string().url().nullable().describe("Image URL or null."),
  stockImageKind: z.enum(["themealdb_meal", "themealdb_ingredient"]).nullable().optional().describe("Normalized TheMealDB stock image kind."),
  stockImageName: z.string().min(1).max(255).nullable().optional().describe("Exact normalized TheMealDB stock image name."),
  caloriesPerUnit: z.number().nonnegative().nullable().describe("Calories per unit or null."),
  proteinPerUnit: z.number().nonnegative().nullable().describe("Protein grams per unit or null."),
  carbsPerUnit: z.number().nonnegative().nullable().describe("Carbohydrate grams per unit or null."),
  fatPerUnit: z.number().nonnegative().nullable().describe("Fat grams per unit or null."),
  fiberPerUnit: z.number().nonnegative().nullable().optional().describe("Fiber grams per unit."),
  costPerUnit: z.number().nonnegative().nullable().describe("Cost per unit or null."),
  currency: z.string().describe("Currency code for cost."),
  tags: z.array(z.object({
    slug: z.string().optional().describe("Existing normalized tag slug when known."),
    label: z.string().min(1).describe("Tag label."),
    category: z.enum(["dietary", "nutrition", "prep", "flavor", "custom"]).optional(),
  }).strict()).max(3).optional().describe("Max three attribute chips; existing slugs are preferred."),
  shelfLifeDays: generatedShelfLifeDaysSchema,
}).strict().refine(
  (value) => value.itemType !== "meal_prep" || value.fiberPerUnit != null,
  { message: "Fiber per unit is required for prepared meals." },
);

export const inventoryAddTool = defineTool({
  name: "inventory_add_item",
  description: "Record a known ingredient, packaged food, or prepared batch in kitchen stock.",
  inputSchema: addInput,
  outputSchema: inventoryItemSchema,
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["inventory"],
  execute: (input, context) => inventoryService.create(context.userId, input),
  toUiDirective: (item) => ({
    component: "inventory_action_card",
    action: "added",
    items: [itemSummary(item)],
  }),
});

export const inventoryAdjustTool = defineTool({
  name: "inventory_adjust_quantity",
  description: "Adjust one inventory quantity by a nonzero delta.",
  inputSchema: z.object({
    itemId: z.string().uuid().describe("Inventory item ID."),
    delta: z.number().finite().refine((value) => value !== 0).describe("Positive or negative quantity change."),
  }).strict(),
  outputSchema: inventoryItemSchema,
  annotations: { destructiveHint: true, idempotentHint: false },
  invalidateDomains: ["inventory"],
  execute: ({ itemId, delta }, context) =>
    inventoryService.adjustQuantity(context.userId, itemId, delta),
  toUiDirective: (item) => ({
    component: "inventory_action_card",
    action: "updated",
    items: [itemSummary(item)],
  }),
});

export const inventoryConsumeTool = defineTool({
  name: "inventory_consume_portion",
  description: "When the user says they ate tracked food, consume the identified quantity and atomically record the corresponding meal log. Never use a quantity adjustment for food eaten.",
  inputSchema: z.object({
    itemId: z.string().uuid().describe("Inventory item ID."),
    quantity: z.number().positive().describe("Quantity consumed."),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("Meal category."),
    eatenAt: z.iso.datetime().optional().describe("Consumption time."),
    fiberG: z.number().nonnegative().optional().describe("Fiber grams for the consumed quantity if stock fiber is unknown."),
  }).strict(),
  outputSchema: z.object({ updatedItem: inventoryItemSchema, mealLog: mealLogSchema }).strict(),
  annotations: { destructiveHint: true, idempotentHint: false },
  invalidateDomains: ["inventory", "meal-logs"],
  execute: ({ itemId, ...input }, context) =>
    inventoryService.consumePortion(context.userId, itemId, input),
  toUiDirective: ({ mealLog }) => ({
    component: "consumption_summary_card",
    loggedMeal: {
      name: mealLog.name,
      quantity: mealLog.quantity,
      unit: mealLog.unit,
      calories: mealLog.calories,
      proteinG: mealLog.proteinG,
      carbsG: mealLog.carbsG,
      fatG: mealLog.fatG,
      fiberG: mealLog.fiberG,
      costAmount: mealLog.costAmount,
      currency: mealLog.currency,
    },
  }),
});

export const inventoryAddBatchTool = defineTool({
  name: "inventory_add_batch",
  description: "Atomically add confirmed receipt or photo items to inventory after the user reviewed them.",
  inputSchema: batchCreateInventoryInputSchema.extend({
    items: batchCreateInventoryInputSchema.shape.items.element.extend({
      shelfLifeDays: generatedShelfLifeDaysSchema,
    }).array().min(1).max(100),
  }),
  outputSchema: batchCreateInventoryOutputSchema,
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["inventory"],
  execute: (input, context) => inventoryService.createBatch(context.userId, input),
  toUiDirective: ({ items }) => ({
    component: "inventory_action_card",
    action: "added",
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.remainingQuantity,
      unit: item.unit,
      location: item.storageLocation,
    })),
  }),
});

export const inventoryDiscardTool = defineTool({
  name: "inventory_discard_item",
  description: "Mark one item discarded only after the user clearly confirms discarding it.",
  inputSchema: z.object({
    itemId: z.string().uuid().describe("Inventory item ID."),
  }).strict(),
  outputSchema: inventoryItemSchema,
  annotations: { destructiveHint: true, idempotentHint: false },
  invalidateDomains: ["inventory"],
  execute: ({ itemId }, context) => inventoryService.discardItem(context.userId, itemId),
  toUiDirective: (item) => ({
    component: "inventory_action_card",
    action: "discarded",
    items: [itemSummary(item)],
  }),
});

export const inventoryWriteTools = [
  inventoryAddTool,
  inventoryAddBatchTool,
  inventoryAdjustTool,
  inventoryConsumeTool,
  inventoryDiscardTool,
] as const;
