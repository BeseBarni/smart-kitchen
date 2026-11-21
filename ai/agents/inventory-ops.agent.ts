import { inventoryReadTools } from "../tools/definitions/inventory.read.tools";
import { inventoryWriteTools } from "../tools/definitions/inventory.write.tools";
import { recipesListTool } from "../tools/definitions/recipes.read.tools";
import { recipeCookAndStockTool } from "../tools/definitions/recipes.write.tools";
import { runAgentLoop } from "./agent-loop";
import type { SubAgent } from "./agent.types";
import { tagsListAvailableTool } from "../tools/definitions/tags.tools";

export const inventoryOpsAgent: SubAgent = {
  name: "inventory_ops",
  description: "Handles stock lookups, inventory changes, meal consumption, and cooking batches into storage.",
  execute: (request, context) =>
    runAgentLoop({
      agent: "inventory_ops",
      request,
      context,
      tools: [...inventoryReadTools, ...inventoryWriteTools, recipesListTool, recipeCookAndStockTool, tagsListAvailableTool],
      system: [
        "You are the Inventory Operations agent for a user's kitchen.",
        "Look up current inventory and saved recipes before mutating stock; use exact IDs returned by tools.",
        "Never substitute a similarly named recipe; require an exact title match or the requested recipe ID.",
        "If a name or quantity is ambiguous, ask a focused clarification instead of guessing.",
        "When the user says they ate tracked food, look it up and use inventory_consume_portion for each identified item and amount, which both deducts stock and logs the meal. An explicit report of eating is authorization; no additional confirmation is needed when item and amount are clear. Never use inventory_adjust_quantity for consumption.",
        "Preserve unknown nutrition as unknown. If fiber is unknown, provide a reasonable estimate only when justified; otherwise omit fiber instead of blocking the meal log. Do not claim a meal or deduction succeeded when the tool failed.",
        "Discard and consequential changes other than a clear report of food already eaten require explicit confirmation in a prior user turn.",
        "Stay within kitchen inventory, meal logging, and cooking-and-stocking tasks.",
        "Before assigning chips, call tags_list_available and strongly prefer existing canonical or user slugs.",
        "Maximum three attribute tags plus one item-type chip. Always provide realistic fridge/freezer/pantry shelfLifeDays with null where unsuitable.",
      ].join("\n"),
    }),
};
