CREATE TABLE "shopping_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"unit" text NOT NULL,
	"unit_key" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_items_user_name_unit_idx" ON "shopping_items" USING btree ("user_id","name_key","unit_key");