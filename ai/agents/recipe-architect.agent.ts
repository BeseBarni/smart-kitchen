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
import { mealPrepArchitectSkill, type MealPrepInput, type MealPrepOutput } from "../skills/meal-prep-architect.skill";
import { nutritionCostEstimatorSkill } from "../skills/nutrition-cost-estimator.skill";
import { runAgentLoop } from "./agent-loop";
import type { AgentContext, LedgerItem, SubAgent } from "./agent.types";
import type { SkillDefinition, SkillRun } from "../skills/skill.types";
import { tagsListAvailableTool } from "../tools/definitions/tags.tools";
import { mealDbSearchForAgent } from "../tools/adapters/mealdb-search.adapter";

function jsonValue(value: unknown) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Skill ledger data is not JSON serializable.");
  return chatJsonValueSchema.parse(JSON.parse(encoded));
}

export function mealPrepRecipeDirective(run: Pick<SkillRun<MealPrepInput, MealPrepOutput>, "input" | "output">): UiDirective {
  const { output, input } = run;
  return {
    component: "recipe_preview_card",
    status: "draft",
    recipe: {
      title: output.title,
      description: output.description,
      servings: output.servings,
      prepTimeMin: output.prepTimeMin,
      cookTimeMin: output.cookTimeMin,
      isFreezerFriendly: output.isFreezerFriendly,
      ingredients: output.ingredients,
      instructions: output.instructions,
      caloriesPerServing: output.estimatedMacrosPerServing.calories,
      proteinPerServing: output.estimatedMacrosPerServing.proteinG,
      carbsPerServing: output.estimatedMacrosPerServing.carbsG,
      fatPerServing: output.estimatedMacrosPerServing.fatG,
      fiberPerServing: output.estimatedMacrosPerServing.fiberG,
      costPerServing: output.estimatedCostPerServing,
      currency: input.currency,
      tags: output.tags,
      shelfLifeDays: output.shelfLifeDays,
    },
    canSave: true,
    canCookAndStock: false,
  };
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
      const result = await skill.execute(input, toolContext.emit, context.locale);
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
        tagsListAvailableTool,
        mealDbSearchForAgent(context),
        skillTool(
          "meal_prep_architect_skill",
          "Generate a structured batch-cookable recipe from validated meal-prep context.",
          mealPrepArchitectSkill,
          context,
          mealPrepRecipeDirective,
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
        "Only treat a recipe as an existing match when its complete title matches the requested title; never substitute a similarly named recipe.",
        "Use isolated skills with only the exact structured data they need.",
        "Present generated recipes as drafts. Save only after explicit user approval.",
        "When an approved save is requested, call recipes_create and report its returned recipe ID; a draft or lookup is not a saved recipe.",
        "For every generated recipe estimate calories, protein, carbs, fat, and fiber per serving from the ingredient quantities, even when catalog values are unavailable. Use null for calories or macros only when not reasonably estimable, and preserve the estimates when presenting or saving the recipe.",
        "Do not claim nutrition or pricing precision when inputs are missing.",
        "The meal_prep_architect_skill automatically presents its generated recipe as a card. Do not call ui_present_recipe_draft again for the same recipe unless it has changed.",
        "Use ui_present_recipe_draft for complete generated proposals not already presented by the meal prep skill, and stay within kitchen tasks.",
        "For a saved recipe requested in detail, use recipes_get_detail so the user can open its recipe card.",
        "Before assigning chips, call tags_list_available and strongly prefer existing canonical or user slugs.",
        "Maximum three attribute tags plus one item-type chip. Always provide realistic fridge/freezer/pantry shelfLifeDays with null where unsuitable.",
        "For a meal or ingredient without a user-uploaded photo, call media_search_themealdb_images with concise English terms for query, fallbackEnglishTerm, and mainIngredient even when the user's language is different. Keep user-facing text in the selected language.",
        "Only persist stockImageKind and stockImageName returned directly by media_search_themealdb_images. Never invent filenames.",
        "If no returned candidate visually fits, omit the stock image fields rather than attaching a mismatch.",
      ].join("\n"),
    }),
}
