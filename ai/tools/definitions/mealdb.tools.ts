import { mealDbService } from "@app/modules";
import { z } from "zod";
import { defineTool, toolOk } from "./tool.types";

const candidateSchema = z.object({
  label: z.string().describe("Human-readable dish or ingredient label."),
  stockImageKind: z.enum(["themealdb_meal", "themealdb_ingredient"]).describe("The normalized stock image kind."),
  stockImageName: z.string().describe("The exact normalized image name returned by TheMealDB."),
  previewUrl: z.string().url().describe("Medium-size TheMealDB preview URL."),
}).strict();

export const mealDbToolInputSchema = z.object({
  kind: z.enum(["meal", "ingredient"]).describe("Whether to search meal photos or ingredient illustrations."),
  query: z.string().trim().min(1).describe("Concise English culinary search term, translated from the user's language."),
  fallbackEnglishTerm: z.string().trim().min(1).optional().describe("Alternative English name to try if the primary search has no results."),
  mainIngredient: z.string().trim().min(1).optional().describe("English main ingredient for meal fallback filtering."),
}).strict();

export const mediaSearchTheMealDbTool = defineTool({
  name: "media_search_themealdb_images",
  description: "Search verified TheMealDB stock image candidates for a meal or ingredient. Use only returned stockImageName values in persisted records.",
  inputSchema: mealDbToolInputSchema,
  outputSchema: z.object({
    candidates: z.array(candidateSchema).max(6).describe("Top verified compact image candidates."),
  }).strict(),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async (input) => {
    let result = input.kind === "ingredient"
      ? await mealDbService.searchIngredientImages(input.query, 6)
      : await mealDbService.searchMealImages(input.query, {
        fallbackEnglishTerm: input.fallbackEnglishTerm,
        mainIngredient: input.mainIngredient,
        limit: 6,
      });
    if (!result.success) return result;
    if (input.kind === "ingredient" && result.data.length === 0 && input.fallbackEnglishTerm
      && input.fallbackEnglishTerm.toLowerCase() !== input.query.toLowerCase()) {
      result = await mealDbService.searchIngredientImages(input.fallbackEnglishTerm, 6);
    }
    if (!result.success) return result;
    return toolOk({ candidates: result.data.slice(0, 6) });
  },
});
