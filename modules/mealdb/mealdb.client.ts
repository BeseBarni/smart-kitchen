import { err, ok, type AppError, type Result } from "@app/shared";
import { z } from "zod";

type MealDbMeal = {
  idMeal: string;
  strMeal: string;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
  strSource?: string | null;
  strYoutube?: string | null;
  [key: string]: string | null | undefined;
};

type MealDbIngredient = { idIngredient: string; strIngredient: string };

type MealDbPayload =
  | { meals: MealDbMeal[] | null | "no data found" }
  | { meals: null }
  | { ingredients: MealDbIngredient[] | null | "no data found" };

function apiError(message: string): AppError {
  return { code: "INTERNAL_ERROR", message };
}

function emptyResult(payload: MealDbPayload): boolean {
  if ("meals" in payload) return payload.meals == null || payload.meals === "no data found";
  if ("ingredients" in payload) return payload.ingredients == null || payload.ingredients === "no data found";
  return false;
}

export async function requestMealDb(
  endpoint: "search.php" | "filter.php" | "lookup.php" | "list.php",
  params: Record<string, string>,
): Promise<Result<MealDbPayload, AppError>> {
  const version = process.env.MEALDB_API_VERSION?.trim() || "v1";
  const apiKey = process.env.MEALDB_API_KEY?.trim() || "1";
  const url = new URL(`https://www.themealdb.com/api/json/${encodeURIComponent(version)}/${encodeURIComponent(apiKey)}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!response.ok) return err(apiError(`TheMealDB request failed with status ${response.status}.`));
    const payload = await response.json() as MealDbPayload;
    return ok(emptyResult(payload) ? ("meals" in payload
      ? { meals: null }
      : { ingredients: null }) : payload);
  } catch (error) {
    return err(apiError(error instanceof Error ? `TheMealDB request failed: ${error.message}` : "TheMealDB request failed."));
  }
}

export async function searchMealsByName(query: string): Promise<Result<MealDbMeal[], AppError>> {
  const result = await requestMealDb("search.php", { s: query });
  if (!result.success) return result;
  if (!("meals" in result.data) || !Array.isArray(result.data.meals)) return ok([]);
  return ok(result.data.meals);
}

export async function filterMealsByIngredient(ingredient: string): Promise<Result<MealDbMeal[], AppError>> {
  const result = await requestMealDb("filter.php", { i: ingredient });
  if (!result.success) return result;
  if (!("meals" in result.data) || !Array.isArray(result.data.meals)) return ok([]);
  return ok(result.data.meals);
}

export async function filterMealsByCategory(category: string): Promise<Result<MealDbMeal[], AppError>> {
  const result = await requestMealDb("filter.php", { c: category });
  if (!result.success) return result;
  if (!("meals" in result.data) || !Array.isArray(result.data.meals)) return ok([]);
  return ok(result.data.meals);
}

export async function lookupMealById(id: string): Promise<Result<MealDbMeal | null, AppError>> {
  const result = await requestMealDb("lookup.php", { i: id });
  if (!result.success) return result;
  if (!("meals" in result.data) || !Array.isArray(result.data.meals)) return ok(null);
  return ok(result.data.meals[0] ?? null);
}

export async function listAllIngredients(): Promise<Result<MealDbIngredient[], AppError>> {
  const result = await requestMealDb("list.php", { i: "list" });
  if (!result.success) return result;
  const parsed = z.object({
    meals: z.array(z.object({ idIngredient: z.string(), strIngredient: z.string() })).nullable(),
  }).safeParse(result.data);
  if (!parsed.success) return err(apiError("TheMealDB returned an invalid ingredient catalogue."));
  return ok(parsed.data.meals ?? []);
}
