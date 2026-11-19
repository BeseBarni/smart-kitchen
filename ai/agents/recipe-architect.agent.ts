import { chatJsonValueSchema } from "@app/modules";
import type { z } from "zod";
import type { UiDirective } from "../core/ui.types";
import { profileGetTool } from "../tools/definitions/context.tools";
import { ingredientsSearchTool, ingredientsCreateTool } from "../tools/definitions/ingredients.tools";
import { inventoryListTool, inventoryExpiringTool } from "../tools/definitions/inventory.read.tools";
import { recipeReadTools } from "../tools/definitions/recipes.read.tools";
import { recipeCreateTool } from "../tools/definitions/recipes.write.tools";
import { presentRecipeDraftTool } from "../tools/definitions/ui.tools";
import type { ToolDefinition } from "../tools/definitions/tool.types";
import { fridgeRescueSkill } from "../skills/fridge-rescue.skill";
import { mealPrepArchitectSkill } from "../skills/meal-prep-architect.skill";
import { nutritionCostEstimatorSkill } from "../skills/nutrition-cost-estimator.skill";
import { runAgentLoop } from "./agent-loop";
import type { AgentContext, LedgerItem, SubAgent } from "./agent.types";
import type { SkillDefinition, SkillRun } from "../skills/skill.types";

function jsonValue(value: unknown) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Skill ledger data is not JSON serializable.");
  return chatJsonValueSchema.parse(JSON.parse(encoded));
}

function skillTool<TInputSchema extends z.ZodType, TOutputSchema extends z.ZodType>(
  name: string,
  description: string,
  skill: SkillDefinition<TInputSchema, TOutputSchema>,
  context: AgentContext,
  toUiDirective?: (
    run: SkillRun<z.output<TInputSchema>, z.output<TOutputSchema>>,
  ) => UiDirective,
): ToolDefinition {
  return {
    name,
    description,
    inputSchema: skill.inputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    execute: async (input, toolContext) => {
      const result = await skill.execute(input, toolContext.emit);
      if (!result.success) return { success: false, error: result.error };
      context.usage.inputTokens += result.data.usage.inputTokens;
      context.usage.outputTokens += result.data.usage.outputTokens;
      const ledgerItem: LedgerItem = {
        type: "skill_execution",
        role: "assistant",
        payload: {
          kind: "skill_execution",
          input: jsonValue(result.data.input),
          output: jsonValue(result.data.output),
        },
        metadata: {
          inputTokens: result.data.usage.inputTokens,
          outputTokens: result.data.usage.outputTokens,
          latencyMs: result.data.latencyMs,
        },
      };
      await context.recordLedger([ledgerItem]);
      return {
        success: true,
        data: result.data.output,
        ...(toUiDirective ? { uiDirective: toUiDirective(result.data) } : {}),
      };
    },
  };
}

export const recipeArchitectAgent: SubAgent = {
  name: "recipe_architect",
  description: "Designs, estimates, presents, and saves meal-prep recipes and expiring-food rescue plans.",
  execute: (request, context) =>
    runAgentLoop({
      agent: "recipe_architect",
      request,
      context,
      modelTier: "reasoning",
      tools: [
        ...recipeReadTools,
        recipeCreateTool,
        ingredientsSearchTool,
        ingredientsCreateTool,
        inventoryListTool,
        inventoryExpiringTool,
        profileGetTool,
        presentRecipeDraftTool,
        skillTool(
          "meal_prep_architect_skill",
          "Generate a structured batch-cookable recipe from validated meal-prep context.",
          mealPrepArchitectSkill,
          context,
        ),
        skillTool(
          "fridge_rescue_skill",
          "Rank meal plans that use foods approaching expiry.",
          fridgeRescueSkill,
          context,
          (run) => ({
            component: "expiring_rescue_card",
            expiringItems: run.input.expiringItems.map((item) => ({
              id: item.id ?? item.name,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              expiresAt: item.expiresAt ?? null,
            })),
            rescueOptions: run.output.rescueOptions.map((option) => ({
              title: option.title,
              usesExpiringItems: option.usesExpiringItems,
              prepTimeMin: option.prepTimeMin,
            })),
          }),
        ),
        skillTool(
          "nutrition_cost_estimator_skill",
          "Estimate recipe macros and cost from known ingredient data.",
          nutritionCostEstimatorSkill,
          context,
        ),
      ],
      system: [
        "You are the Recipe Architect for meal prep and expiring-food rescue.",
        "Check saved recipes and available ingredients before proposing duplicates or invented prices.",
        "Use isolated skills with only the exact structured data they need.",
        "Present generated recipes as drafts. Save only after explicit user approval.",
        "Do not claim nutrition or pricing precision when inputs are missing.",
        "Use ui_present_recipe_draft for generated proposals and stay within kitchen tasks.",
      ].join("\n"),
    }),
}
