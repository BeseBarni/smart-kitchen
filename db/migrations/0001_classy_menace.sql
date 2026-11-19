DELETE FROM "auth_users" AS auth_user
WHERE NOT EXISTS (
	SELECT 1
	FROM "neon_auth"."user" AS neon_user
	WHERE neon_user."id"::text = auth_user."id"
);
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_user_id_auth_users_id_fk";
--> statement-breakpoint
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_user_id_auth_users_id_fk";
--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_user_id_auth_users_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_user_id_auth_users_id_fk";
--> statement-breakpoint
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_user_id_auth_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_id_auth_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "ingredients" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "meal_logs" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP TABLE "auth_users";