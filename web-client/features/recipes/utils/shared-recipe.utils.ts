import type { TranslationKey } from "@/lib/i18n";
import type { SharedRecipePublicDto } from "@app/modules/schemas";

const tagTranslationKeys: Readonly<Record<string, TranslationKey>> = {
  "inventory.tagsHighProtein": "inventory.tagsHighProtein",
  "inventory.tagsHealthy": "inventory.tagsHealthy",
  "inventory.tagsFreezerFriendly": "inventory.tagsFreezerFriendly",
  "inventory.tagsSpicy": "inventory.tagsSpicy",
  "inventory.tagsBudgetFriendly": "inventory.tagsBudgetFriendly",
  "inventory.tagsLowCarb": "inventory.tagsLowCarb",
  "inventory.tagsVegetarian": "inventory.tagsVegetarian",
  "inventory.tagsQuick": "inventory.tagsQuick",
  "inventory.tagsFreshProduce": "inventory.tagsFreshProduce",
  "inventory.tagsComfortFood": "inventory.tagsComfortFood",
};

export function sharedTagLabel(
  tag: SharedRecipePublicDto["tags"][number],
  translate: (key: TranslationKey) => string,
): string {
  const key = tag.i18nKey ? tagTranslationKeys[tag.i18nKey] : undefined;
  return key ? translate(key) : tag.label;
}

export function scaleIngredientQuantity(
  quantity: number,
  originalServings: number,
  targetServings: number,
): number {
  return quantity * targetServings / originalServings;
}
