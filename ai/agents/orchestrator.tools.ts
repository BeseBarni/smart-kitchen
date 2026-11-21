import { recipeSchema } from "@app/modules";
import { err } from "@app/shared";
import { z } from "zod";
import { presentReceiptImportTool, presentRecommendationsTool, requestConfirmationTool } from "../tools/definitions/ui.tools";
import { defineTool, toolOk } from "../tools/definitions/tool.types";
import { profileUpdateTargetsTool } from "../tools/definitions/profile.write.tools";
import { inventoryOpsAgent } from "./inventory-ops.agent";
import { kitchenAdvisorAgent } from "./kitchen-advisor.agent";
import { recipeArchitectAgent } from "./recipe-architect.agent";
import type { AgentContext } from "./agent.types";

export function orchestratorTools(context: AgentContext) {
  const inventory = defineTool({
    name: "delegate_to_inventory_ops",
    description: "Delegate stock lookup, consumption logging, inventory changes, or cooked-batch stocking.",
    inputSchema: z.object({
      task: z.string().min(1).describe("Clear inventory task to perform."),
      contextHint: z.string().optional().describe("Only relevant structured context needed by the specialist."),
    }).strict(),
    annotations: { readOnlyHint: false },
    execute: async (input) => {
      context.emit({
        type: "agent_status",
        agent: "orchestrator",
        status: "delegating",
        label: "Delegating an inventory task.",
      });
      return toolOk({ summary: (await inventoryOpsAgent.execute(input, context)).summary });
    },
  });
  const recipe = defineTool({
    name: "delegate_to_recipe_architect",
    description: "Delegate recipe design, expiring-food rescue, nutrition estimates, recipe lookup, or approved save.",
    inputSchema: z.object({
      task: z.string().min(1).describe("Clear recipe task."),
      mode: z.enum(["design", "rescue", "save", "lookup"]).describe("Recipe workflow mode."),
    }).strict(),
    annotations: { readOnlyHint: false },
    execute: async (input) => {
      context.emit({
        type: "agent_status",
        agent: "orchestrator",
        status: "delegating",
        label: "Delegating a recipe task.",
      });
      const result = await recipeArchitectAgent.execute({
        task: input.task,
        contextHint: `Requested mode: ${input.mode}`,
      }, context);
      const savedRecipes = result.ledgerItems.flatMap((item) => {
        if (item.toolName !== "recipes_create" || item.payload.kind !== "tool_result") return [];
        const parsed = recipeSchema.pick({ id: true, title: true }).safeParse(item.payload.result);
        return parsed.success ? [parsed.data] : [];
      });
      if (input.mode === "save" && savedRecipes.length === 0) {
        return err({
          code: "VALIDATION_ERROR",
          message: "No recipe was saved. Do not stock a substitute; clarify or retry the requested save.",
        });
      }
      return toolOk({ summary: result.summary, savedRecipes });
    },
  });
  const advisor = defineTool({
    name: "delegate_to_kitchen_advisor",
    description: "Delegate a read-only question about inventory, recipes, preferences, or meal totals.",
    inputSchema: z.object({
      question: z.string().min(1).describe("Question to answer from read-only domain data."),
    }).strict(),
    annotations: { readOnlyHint: true },
    execute: async ({ question }) => {
      context.emit({
        type: "agent_status",
        agent: "orchestrator",
        status: "delegating",
        label: "Delegating a read-only kitchen question.",
      });
      return toolOk({ summary: (await kitchenAdvisorAgent.execute({ task: question }, context)).summary });
    },
  });
  return [
    inventory,
    recipe,
    advisor,
    profileUpdateTargetsTool,
    requestConfirmationTool,
    presentRecommendationsTool,
    presentReceiptImportTool,
  ] as const;
}
