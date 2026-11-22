INSERT INTO "public"."expense_categories" (
	"user_id",
	"slug",
	"label",
	"i18n_key",
	"icon_name",
	"color_token",
	"sort_order"
) VALUES
	(NULL, 'food', 'Food', 'budget.categories.food', 'ShoppingBasket', 'positive', 0),
	(NULL, 'household', 'Household', 'budget.categories.household', 'House', 'primary', 1),
	(NULL, 'entertainment', 'Entertainment', 'budget.categories.entertainment', 'Ticket', 'warning', 2),
	(NULL, 'other', 'Other', 'budget.categories.other', 'Ellipsis', 'neutral', 3)
ON CONFLICT DO NOTHING;