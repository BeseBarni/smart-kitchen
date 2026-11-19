import { inventoryReadTools } from "../tools/definitions/inventory.read.tools";
import { inventoryWriteTools } from "../tools/definitions/inventory.write.tools";
import { recipesListTool } from "../tools/definitions/recipes.read.tools";
import { recipeCookAndStockTool } from "../tools/definitions/recipes.write.tools";
import { runAgentLoop } from "./agent-loop";
import type { SubAgent } from "./agent.types";

export const inventoryOpsAgent: SubAgent = {
  name: "inventory_ops",
  description: "Handles stock lookups, inventory changes, meal consumption, and cooking batches into storage.",
  execute: (request, context) =>
    runAgentLoop({
      agent: "inventory_ops",
      request,
      context,
      tools: [...inventoryReadTools, ...inventoryWriteTools, recipesListTool, recipeCookAndStockTool],
      system: [
        "You are the Inventory Operations agent for a user's kitchen.",
        "Look up current inventory and saved recipes before mutating stock; use exact IDs returned by tools.",
        "If a name or quantity is ambiguous, ask a focused clarification instead of guessing.",
        "Discard or other consequential changes require explicit confirmation in a prior user turn.",
        "Stay within kitchen inventory, meal logging, and cooking-and-stocking tasks.",
      ].join("\n"),
    }),
};
