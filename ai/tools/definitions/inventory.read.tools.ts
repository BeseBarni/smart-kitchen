import { inventoryService } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";

const inventoryFilters = z.object({
  storageLocation: z.enum(["fridge", "freezer", "pantry"]).optional().describe("Limit to one storage location."),
  status: z.enum(["in_stock", "consumed", "discarded"]).default("in_stock").describe("Inventory status to include."),
  itemType: z.enum(["meal_prep", "ingredient", "packaged"]).optional().describe("Limit to one item type."),
  search: z.string().optional().describe("Name fragment to search for."),
  sortBy: z.enum(["expiresAt", "name", "createdAt"]).default("expiresAt").describe("Sort order."),
  limit: z.number().int().positive().max(100).default(50).describe("Maximum items to return."),
  offset: z.number().int().nonnegative().default(0).describe("Number of items to skip."),
}).strict();

export const inventoryListTool = defineTool({
  name: "inventory_list",
  description: "List tracked items. Use for specific inventory lookups; do not mutate stock.",
  inputSchema: inventoryFilters,
  annotations: { readOnlyHint: true },
  execute: (input, context) => inventoryService.list(context.userId, input),
});

export const inventorySummaryTool = defineTool({
  name: "inventory_get_summary",
  description: "Get in-stock counts and quantities by fridge, freezer, and pantry.",
  inputSchema: z.object({}).strict().describe("No filters are required."),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: (_input, context) => inventoryService.getSummary(context.userId),
});

export const inventoryExpiringTool = defineTool({
  name: "inventory_list_expiring",
  description: "List in-stock items expiring within the requested number of hours.",
  inputSchema: z.object({
    withinHours: z.number().positive().max(8760).default(48).describe("Expiry window in hours."),
  }).strict(),
  annotations: { readOnlyHint: true },
  execute: (input, context) => inventoryService.listExpiring(context.userId, input.withinHours),
});

export const inventoryReadTools = [
  inventoryListTool,
  inventorySummaryTool,
  inventoryExpiringTool,
] as const;
