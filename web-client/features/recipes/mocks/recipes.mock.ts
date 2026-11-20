import type { FavoriteUpdate, Recipe } from "./mock.types";

const initialRecipes: Recipe[] = [
  {
    id: "gyros", title: "Mediterranean Gyros Chicken Bowls",
    image: "/recipes/gyros.jpg", imageAlt: "Chicken, brown rice and tzatziki in a meal prep container",
    highlight: "AI Discovered", stockLabel: "5/5 In Stock",
    prepMinutes: 35, portions: 6, storageLabel: "Freezer friendly (3 mos)", calories: 520,
    ingredients: ["Chicken Breast", "Tzatziki & Cucumber", "Brown Rice", "Lemon & Oregano"],
    tags: ["meal-prep", "ai-generated", "freezer-friendly"], favorite: false,
  },
  {
    id: "gnocchi", title: "Pesto Rosso Gnocchi with Basil",
    image: "/recipes/gnocchi.jpg", imageAlt: "Gnocchi with red pesto, basil and parmesan",
    highlight: "Quick Rescue", stockLabel: "Uses Expiring Pesto",
    prepMinutes: 20, portions: 4, storageLabel: "Fridge 4 days", calories: 450,
    ingredients: ["Potato Gnocchi", "Sun-dried Tomato Pesto", "Fresh Basil", "Pine Nuts"],
    tags: ["meal-prep"], favorite: false,
  },
  {
    id: "chili", title: "Slow Cooker Beef Chili",
    image: "/recipes/chili.jpg", imageAlt: "Beef chili topped with avocado in a glass container",
    highlight: "High Batch Yield", stockLabel: "Larder Staples (100%)",
    prepMinutes: 45, portions: 8, storageLabel: "Freezer (4 mos)", calories: 580,
    ingredients: ["Lean Beef", "Black Beans", "Fire Roasted Tomatoes", "Avocado"],
    tags: ["meal-prep", "freezer-friendly"], favorite: true,
  },
  {
    id: "tortillas", title: "Sweet Potato & Black Bean Tortillas",
    image: "/recipes/tortillas.jpg", imageAlt: "Flour tortillas beside sweet potato and black bean meal prep",
    highlight: "Vegetarian Prep", stockLabel: "4/4 In Stock",
    prepMinutes: 30, portions: 6, storageLabel: "Freezer friendly", calories: 390,
    ingredients: ["Sweet Potato", "Black Beans", "Flour Tortillas", "Cilantro Lime"],
    tags: ["meal-prep", "freezer-friendly"], favorite: false,
  },
];

let recipes = structuredClone(initialRecipes);

export async function listRecipes(): Promise<Recipe[]> {
  return structuredClone(recipes);
}

export async function setRecipeFavorite({ id, favorite }: FavoriteUpdate): Promise<Recipe> {
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe) throw new Error("Recipe not found.");
  const updated = { ...recipe, favorite };
  const result = structuredClone(updated);
  recipes = recipes.map((item) => item.id === id ? updated : item);
  return result;
}
