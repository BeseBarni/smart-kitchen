import type { TranslationKey } from "@/lib/i18n";

const CATEGORY_TRANSLATION_KEYS: Readonly<Record<string, TranslationKey>> = {
  food: "budget.categories.food",
  household: "budget.categories.household",
  entertainment: "budget.categories.entertainment",
  other: "budget.categories.other",
  "budget.categories.food": "budget.categories.food",
  "budget.categories.household": "budget.categories.household",
  "budget.categories.entertainment": "budget.categories.entertainment",
  "budget.categories.other": "budget.categories.other",
};

export function expenseCategoryLabel(
  category: { i18nKey?: string | null; slug?: string; label: string },
  translate: (key: TranslationKey) => string,
): string {
  const translationKey = (category.i18nKey ? CATEGORY_TRANSLATION_KEYS[category.i18nKey] : undefined) ??
    (category.slug ? CATEGORY_TRANSLATION_KEYS[category.slug] : undefined);
  return translationKey ? translate(translationKey) : category.label;
}
