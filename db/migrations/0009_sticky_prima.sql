CREATE TYPE "public"."receipt_source" AS ENUM('scanned', 'manual');--> statement-breakpoint
ALTER TYPE "public"."media_purpose" ADD VALUE 'receipt_scan';--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"i18n_key" text,
	"icon_name" text,
	"color_token" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"default_category_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"raw_receipt_text" text,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
	"unit" text,
	"amount" numeric(10, 2) NOT NULL,
	"inventory_item_id" uuid,
	"ingredient_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_items_quantity_positive_check" CHECK ("receipt_items"."quantity" > 0),
	CONSTRAINT "receipt_items_amount_nonnegative_check" CHECK ("receipt_items"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_id" uuid,
	"media_asset_id" uuid,
	"source" "receipt_source" DEFAULT 'manual' NOT NULL,
	"title" text,
	"purchased_at" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_budget_category_limits" (
	"monthly_budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"limit_amount" numeric(10, 2) NOT NULL,
	CONSTRAINT "monthly_budget_category_limits_monthly_budget_id_category_id_pk" PRIMARY KEY("monthly_budget_id","category_id"),
	CONSTRAINT "monthly_budget_category_limits_nonnegative_check" CHECK ("monthly_budget_category_limits"."limit_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "monthly_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year_month" text NOT NULL,
	"total_limit_amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_budgets_year_month_check" CHECK ("monthly_budgets"."year_month" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "monthly_budgets_limit_nonnegative_check" CHECK ("monthly_budgets"."total_limit_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_default_category_id_expense_categories_id_fk" FOREIGN KEY ("default_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_category_limits" ADD CONSTRAINT "monthly_budget_category_limits_monthly_budget_id_monthly_budgets_id_fk" FOREIGN KEY ("monthly_budget_id") REFERENCES "public"."monthly_budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_category_limits" ADD CONSTRAINT "monthly_budget_category_limits_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_global_slug_uidx" ON "expense_categories" USING btree ("slug") WHERE "expense_categories"."user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_user_slug_uidx" ON "expense_categories" USING btree ("user_id","slug") WHERE "expense_categories"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "expense_categories_user_sort_idx" ON "expense_categories" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_user_normalized_name_uidx" ON "merchants" USING btree ("user_id","normalized_name");--> statement-breakpoint
CREATE INDEX "merchants_user_name_idx" ON "merchants" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_sort_idx" ON "receipt_items" USING btree ("receipt_id","sort_order");--> statement-breakpoint
CREATE INDEX "receipt_items_category_idx" ON "receipt_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "receipt_items_inventory_item_idx" ON "receipt_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "receipts_user_purchased_at_idx" ON "receipts" USING btree ("user_id","purchased_at");--> statement-breakpoint
CREATE INDEX "receipts_user_merchant_purchased_at_idx" ON "receipts" USING btree ("user_id","merchant_id","purchased_at");--> statement-breakpoint
CREATE INDEX "receipts_media_asset_id_idx" ON "receipts" USING btree ("media_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_budgets_user_year_month_uidx" ON "monthly_budgets" USING btree ("user_id","year_month");