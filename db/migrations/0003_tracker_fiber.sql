ALTER TABLE "user_profiles" ADD COLUMN "daily_fiber_g" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "fiber_per_serving" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "fiber_per_unit" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "meal_logs" ADD COLUMN "fiber_g" numeric(10, 2);