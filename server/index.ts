import { Hono } from "hono";
import { cors } from "hono/cors";
import { accountRoutes } from "./routes/account.routes";
import { authRoutes } from "./routes/auth.routes";
import { chatRoutes } from "./routes/chat.routes";
import { healthRoutes } from "./routes/health.routes";
import { ingredientRoutes } from "./routes/ingredients.routes";
import { inventoryRoutes } from "./routes/inventory.routes";
import { mealLogRoutes } from "./routes/meal-logs.routes";
import { mealSuggestionsRoutes } from "./routes/meal-suggestions.routes";
import { profileRoutes } from "./routes/profile.routes";
import { recipeRoutes } from "./routes/recipes.routes";
import { shoppingRoutes } from "./routes/shopping.routes";
import type { AuthEnvironment } from "./middleware/auth.middleware";
import { errorResponse } from "./middleware/error-handler";

function allowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const app = new Hono<AuthEnvironment>()
  .basePath("/api")
  .use(
    "*",
    cors({
      origin: (origin) => allowedOrigins().includes(origin) ? origin : "",
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["X-Conversation-Id"],
    }),
  )
  .onError((error, context) => {
    console.error("Unhandled API error:", error);
    return errorResponse(context, {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    });
  })
  .route("/", authRoutes)
  .route("/", accountRoutes)
  .route("/", healthRoutes)
  .route("/profile", profileRoutes)
  .route("/ingredients", ingredientRoutes)
  .route("/recipes", recipeRoutes)
  .route("/inventory", inventoryRoutes)
  .route("/shopping", shoppingRoutes)
  .route("/meal-logs", mealLogRoutes)
  .route("/meal-suggestions", mealSuggestionsRoutes)
  .route("/", chatRoutes);

export type AppType = typeof app;
