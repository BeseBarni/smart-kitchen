ALTER TABLE "recipes" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "shared_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_share_token_uidx" ON "recipes" USING btree ("share_token") WHERE "recipes"."share_token" is not null;