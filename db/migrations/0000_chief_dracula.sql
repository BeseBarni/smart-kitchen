CREATE TYPE "public"."base_unit" AS ENUM('g', 'ml', 'pcs');--> statement-breakpoint
CREATE TYPE "public"."conversation_item_type" AS ENUM('message', 'tool_call', 'tool_result', 'skill_execution');--> statement-breakpoint
CREATE TYPE "public"."conversation_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."inventory_item_type" AS ENUM('meal_prep', 'ingredient', 'packaged');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('in_stock', 'consumed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."recipe_source" AS ENUM('manual', 'ai_skill');--> statement-breakpoint
CREATE TYPE "public"."storage_location" AS ENUM('fridge', 'freezer', 'pantry');--> statement-breakpoint
CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"daily_calorie_target" integer,
	"daily_protein_g" integer,
	"daily_carbs_g" integer,
	"daily_fat_g" integer,
	"dietary_preferences" jsonb,
	"currency" text DEFAULT 'HUF' NOT NULL,
	"unit_system" "unit_system" DEFAULT 'metric' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"category" text,
	"image_url" text,
	"default_unit" "base_unit" DEFAULT 'g' NOT NULL,
	"base_quantity" numeric(10, 2) DEFAULT '100.00' NOT NULL,
	"calories" numeric(10, 2),
	"protein_g" numeric(10, 2),
	"carbs_g" numeric(10, 2),
	"fat_g" numeric(10, 2),
	"fiber_g" numeric(10, 2),
	"price_amount" numeric(10, 2),
	"price_quantity" numeric(10, 2),
	"price_unit" text,
	"currency" text DEFAULT 'HUF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"ingredient_id" uuid,
	"display_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"prep_time_min" integer,
	"cook_time_min" integer,
	"servings" numeric(10, 2) NOT NULL,
	"is_freezer_friendly" boolean DEFAULT false NOT NULL,
	"source" "recipe_source" DEFAULT 'manual' NOT NULL,
	"calories_per_serving" numeric(10, 2),
	"protein_per_serving" numeric(10, 2),
	"carbs_per_serving" numeric(10, 2),
	"fat_per_serving" numeric(10, 2),
	"cost_per_serving" numeric(10, 2),
	"currency" text DEFAULT 'HUF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"item_type" "inventory_item_type" NOT NULL,
	"recipe_id" uuid,
	"ingredient_id" uuid,
	"storage_location" "storage_location" NOT NULL,
	"status" "inventory_status" DEFAULT 'in_stock' NOT NULL,
	"initial_quantity" numeric(10, 2) NOT NULL,
	"remaining_quantity" numeric(10, 2) NOT NULL,
	"unit" text DEFAULT 'portion' NOT NULL,
	"prepared_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"image_url" text,
	"calories_per_unit" numeric(10, 2),
	"protein_per_unit" numeric(10, 2),
	"carbs_per_unit" numeric(10, 2),
	"fat_per_unit" numeric(10, 2),
	"cost_per_unit" numeric(10, 2),
	"currency" text DEFAULT 'HUF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"inventory_item_id" uuid,
	"recipe_id" uuid,
	"name" text NOT NULL,
	"meal_type" "meal_type",
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"calories" numeric(10, 2),
	"protein_g" numeric(10, 2),
	"carbs_g" numeric(10, 2),
	"fat_g" numeric(10, 2),
	"cost_amount" numeric(10, 2),
	"currency" text DEFAULT 'HUF' NOT NULL,
	"eaten_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"type" "conversation_item_type" NOT NULL,
	"role" "conversation_role" NOT NULL,
	"call_id" text,
	"tool_name" text,
	"payload" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_items" ADD CONSTRAINT "conversation_items_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredients_user_id_name_idx" ON "ingredients" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipes_user_id_created_at_idx" ON "recipes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_items_user_status_location_idx" ON "inventory_items" USING btree ("user_id","status","storage_location");--> statement-breakpoint
CREATE INDEX "inventory_items_user_expires_at_idx" ON "inventory_items" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "meal_logs_user_eaten_at_idx" ON "meal_logs" USING btree ("user_id","eaten_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_items_conversation_sequence_uq" ON "conversation_items" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE INDEX "conversation_items_conversation_call_id_idx" ON "conversation_items" USING btree ("conversation_id","call_id");--> statement-breakpoint
CREATE INDEX "conversations_user_updated_at_idx" ON "conversations" USING btree ("user_id","updated_at");