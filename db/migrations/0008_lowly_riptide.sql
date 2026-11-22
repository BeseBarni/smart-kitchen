CREATE TYPE "public"."stock_image_kind" AS ENUM('themealdb_meal', 'themealdb_ingredient');--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "stock_image_kind" "stock_image_kind";--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "stock_image_name" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "stock_image_kind" "stock_image_kind";--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "stock_image_name" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "image_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "stock_image_kind" "stock_image_kind";--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "stock_image_name" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_image_asset_id_media_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_stock_image_pair_check" CHECK (("ingredients"."stock_image_kind" is null) = ("ingredients"."stock_image_name" is null));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_stock_image_pair_check" CHECK (("recipes"."stock_image_kind" is null) = ("recipes"."stock_image_name" is null));--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_stock_image_pair_check" CHECK (("inventory_items"."stock_image_kind" is null) = ("inventory_items"."stock_image_name" is null));