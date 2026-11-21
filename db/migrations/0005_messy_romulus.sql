CREATE TYPE "public"."tag_category" AS ENUM('dietary', 'nutrition', 'prep', 'flavor', 'custom');--> statement-breakpoint
CREATE TABLE "ingredient_tags" (
	"ingredient_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "ingredient_tags_ingredient_id_tag_id_pk" PRIMARY KEY("ingredient_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_item_tags" (
	"inventory_item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "inventory_item_tags_inventory_item_id_tag_id_pk" PRIMARY KEY("inventory_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_tags" (
	"recipe_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "recipe_tags_recipe_id_tag_id_pk" PRIMARY KEY("recipe_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"i18n_key" text,
	"category" "tag_category" NOT NULL,
	"color_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "shelf_life_days" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "shelf_life_days" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "shelf_life_days" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_tags" ADD CONSTRAINT "ingredient_tags_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_tags" ADD CONSTRAINT "ingredient_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item_tags" ADD CONSTRAINT "inventory_item_tags_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item_tags" ADD CONSTRAINT "inventory_item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_global_slug_uidx" ON "tags" USING btree ("slug") WHERE "tags"."user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_slug_uidx" ON "tags" USING btree ("user_id","slug") WHERE "tags"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "tags_category_slug_idx" ON "tags" USING btree ("category","slug");