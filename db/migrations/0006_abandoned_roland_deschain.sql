CREATE TYPE "public"."media_purpose" AS ENUM('chat_attachment', 'recipe_cover', 'ingredient_photo', 'avatar', 'inventory_photo');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'uploaded', 'deleted');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "media_purpose" NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "neon_auth"."user" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "avatar_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "image_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "image_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_user_purpose_status_idx" ON "media_assets" USING btree ("user_id","purpose","status");--> statement-breakpoint
CREATE INDEX "media_assets_status_expires_at_idx" ON "media_assets" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_image_asset_id_media_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_image_asset_id_media_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;