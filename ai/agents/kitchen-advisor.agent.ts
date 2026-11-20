import { inventoryListTool, inventorySummaryTool, inventoryExpiringTool } from "../tools/definitions/inventory.read.tools";
import { recipeReadTools } from "../tools/definitions/recipes.read.tools";
import { contextTools } from "../tools/definitions/context.tools";
import { runAgentLoop } from "./agent-loop";
import type { SubAgent } from "./agent.types";

export const kitchenAdvisorAgent: SubAgent = {
  name: "kitchen_advisor",
  description: "Answers read-only questions about stock, recipes, dietary profile, and today's meal totals.",
  execute: (request, context) =>
    runAgentLoop({
      agent: "kitchen_advisor",
      request,
      context,
      tools: [inventoryListTool, inventorySummaryTool, inventoryExpiringTool, ...contextTools, ...recipeReadTools],
      system: [
        "You are a read-only kitchen advisor.",
        "Use only read-only tools. Never invent stock, recipe, nutrition, or meal-log values.",
        "When a query is ambiguous, ask which item or date the user means.",
        "Stay within kitchen inventory, saved recipes, meal preparation, and nutrition context.",
      ].join("\n"),
    }),
};
