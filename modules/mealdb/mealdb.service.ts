import { err, ok, type AppError, type Result } from "@app/shared";
import {
  filterMealsByCategory,
  filterMealsByIngredient,
  listAllIngredients,
  lookupMealById,
  searchMealsByName,
} from "./mealdb.client";
import {
  extractMealDbMealImageName,
  normalizeMealDbIngredientImageName,
  resolveMealDbImageUrl,
} from "./mealdb-image.utils";
import type { MealDbImageCandidate } from "./mealdb.schema";

type IngredientCatalogEntry = { idIngredient: string; strIngredient: string };

let ingredientCatalog: IngredientCatalogEntry[] | null = null;
let ingredientCatalogExpiresAt = 0;
let ingredientCatalogPromise: Promise<Result<IngredientCatalogEntry[], AppError>> | null = null;

async function getIngredientCatalog(): Promise<Result<IngredientCatalogEntry[], AppError>> {
  if (ingredientCatalog && Date.now() < ingredientCatalogExpiresAt) return ok(ingredientCatalog);
  if (!ingredientCatalogPromise) {
    ingredientCatalogPromise = listAllIngredients().then((result) => {
      if (result.success) {
        ingredientCatalog = result.data;
        ingredientCatalogExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
      }
      return result;
    }).finally(() => {
      ingredientCatalogPromise = null;
    });
  }
  return ingredientCatalogPromise;
}

export async function searchIngredientImages(
  query: string,
  limit = 6,
): Promise<Result<MealDbImageCandidate[], AppError>> {
  const catalog = await getIngredientCatalog();
  if (!catalog.success) return catalog;
  const normalizedQuery = normalizeMealDbIngredientImageName(query);
  if (!normalizedQuery) return ok([]);
  const ranked = catalog.data.map((entry) => {
    const name = normalizeMealDbIngredientImageName(entry.strIngredient);
    let rank = 0;
    if (name === normalizedQuery) rank = 400;
    else if (name.startsWith(normalizedQuery)) rank = 300;
    else if (normalizedQuery.startsWith(name)) rank = 220;
    else if (name.includes(normalizedQuery)) rank = 180;
    const overlap = normalizedQuery.split("_").filter((token) => name.includes(token)).length;
    rank += overlap * 20;
    return { entry, name, rank };
  })
    .filter((candidate) => candidate.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))
    .slice(0, Math.min(limit, 6));
  return ok(ranked.map(({ entry, name }) => ({
    label: entry.strIngredient,
    stockImageKind: "themealdb_ingredient" as const,
    stockImageName: name,
    previewUrl: resolveMealDbImageUrl("themealdb_ingredient", name, "medium")
      ?? "https://www.themealdb.com/images/ingredients/no_image-medium.png",
  })));
}

export async function searchMealImages(
  query: string,
  options: { fallbackEnglishTerm?: string; mainIngredient?: string; category?: string; limit?: number } = {},
): Promise<Result<MealDbImageCandidate[], AppError>> {
  let mealsResult = await searchMealsByName(query);
  if (!mealsResult.success) return mealsResult;
  let meals = mealsResult.data;
  if (meals.length === 0 && options.fallbackEnglishTerm
    && options.fallbackEnglishTerm.toLowerCase() !== query.toLowerCase()) {
    mealsResult = await searchMealsByName(options.fallbackEnglishTerm);
    if (!mealsResult.success) return mealsResult;
    meals = mealsResult.data;
  }
  if (meals.length === 0 && options.mainIngredient) {
    const filtered = await filterMealsByIngredient(options.mainIngredient);
    if (!filtered.success) return filtered;
    meals = filtered.data;
  }
  if (meals.length === 0 && options.category) {
    const filtered = await filterMealsByCategory(options.category);
    if (!filtered.success) return filtered;
    meals = filtered.data;
  }
  const candidates: MealDbImageCandidate[] = [];
  for (const summary of meals.slice(0, Math.min(options.limit ?? 6, 6))) {
    const detail = await lookupMealById(summary.idMeal);
    if (!detail.success) return detail;
    if (!detail.data?.strMealThumb) continue;
    const stockImageName = extractMealDbMealImageName(detail.data.strMealThumb);
    if (!stockImageName) continue;
    const previewUrl = resolveMealDbImageUrl("themealdb_meal", stockImageName, "medium");
    if (!previewUrl) continue;
    candidates.push({
      label: detail.data.strMeal,
      stockImageKind: "themealdb_meal",
      stockImageName,
      previewUrl,
    });
  }
  return ok(candidates);
}

export type MealDetails = {
  mealId: string;
  title: string;
  category: string | null;
  area: string | null;
  instructions: string | null;
  source: string | null;
  youtube: string | null;
  stockImageName: string | null;
  stockImageKind: "themealdb_meal";
  ingredients: Array<{ name: string; measure: string | null }>;
};

export async function getMealDetails(mealId: string): Promise<Result<MealDetails, AppError>> {
  if (!/^\d+$/.test(mealId)) {
    return err({ code: "VALIDATION_ERROR", message: "TheMealDB meal ID must be numeric." });
  }
  const result = await lookupMealById(mealId);
  if (!result.success) return result;
  if (!result.data) return err({ code: "ITEM_NOT_FOUND", message: "TheMealDB meal was not found." });
  const meal = result.data;
  const ingredients: MealDetails["ingredients"] = [];
  for (let index = 1; index <= 20; index += 1) {
    const name = meal[`strIngredient${index}`]?.trim();
    if (!name) continue;
    const measure = meal[`strMeasure${index}`]?.trim() || null;
    ingredients.push({ name, measure });
  }
  return ok({
    mealId: meal.idMeal,
    title: meal.strMeal,
    category: meal.strCategory ?? null,
    area: meal.strArea ?? null,
    instructions: meal.strInstructions ?? null,
    source: meal.strSource ?? null,
    youtube: meal.strYoutube ?? null,
    stockImageName: meal.strMealThumb ? extractMealDbMealImageName(meal.strMealThumb) : null,
    stockImageKind: "themealdb_meal",
    ingredients,
  });
}
