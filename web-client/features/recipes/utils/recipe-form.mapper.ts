import type { CreateRecipeInput, RecipeDto } from "@app/modules/schemas";

export function recipeFormValues(recipe?: RecipeDto): CreateRecipeInput {
  if (!recipe) {
    return {
      title: "",
      description: null,
      instructions: [],
      imageUrl: null,
      prepTimeMin: null,
      cookTimeMin: null,
      servings: 4,
      isFreezerFriendly: false,
      source: "manual",
      ingredients: [],
      caloriesPerServing: null,
      proteinPerServing: null,
      carbsPerServing: null,
      fatPerServing: null,
      fiberPerServing: null,
      costPerServing: null,
      currency: "HUF",
    };
  }
  return {
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    imageUrl: recipe.imageUrl,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    servings: recipe.servings,
    isFreezerFriendly: recipe.isFreezerFriendly,
    source: recipe.source,
    ingredients: recipe.ingredients.map(({ ingredientId, displayName, quantity, unit, notes, sortOrder }) => ({
      ingredientId,
      displayName,
      quantity,
      unit,
      notes,
      sortOrder,
    })),
    caloriesPerServing: recipe.caloriesPerServing,
    proteinPerServing: recipe.proteinPerServing,
    carbsPerServing: recipe.carbsPerServing,
    fatPerServing: recipe.fatPerServing,
    fiberPerServing: recipe.fiberPerServing,
    costPerServing: recipe.costPerServing,
    currency: recipe.currency,
  };
}
