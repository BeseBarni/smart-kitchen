import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { hu } from "./dictionaries/hu";
import { isSupportedLocale, LOCALE_META, type SupportedLocale, type TextParams, type TranslationKey, type WidenStrings } from "./types";

const dictionaries: Record<SupportedLocale, WidenStrings<typeof en>> = { en, hu, es };

function lookup(dictionary: object, key: string): string | undefined {
  let value: unknown = dictionary;
  for (const part of key.split(".")) {
    if (typeof value !== "object" || value === null || !Object.hasOwn(value, part)) return undefined;
    value = Object.getOwnPropertyDescriptor(value, part)?.value;
  }
  return typeof value === "string" ? value : undefined;
}

export function resolveText(locale: SupportedLocale, key: TranslationKey, params: TextParams = {}): string {
  const selected = isSupportedLocale(locale) ? locale : "en";
  const text = lookup(dictionaries[selected], key) ?? lookup(en, key);
  if (text === undefined) throw new Error(`Unknown translation key: ${key}`);
  return text.replace(/\{\{(\w+)\}\}/g, (placeholder: string, name: string) => {
    if (!Object.hasOwn(params, name)) {
      console.error(`Missing interpolation parameter "${name}" for "${key}".`);
      return placeholder;
    }
    return String(params[name]);
  });
}

export function formatLocaleDate(locale: SupportedLocale, date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].tag, options).format(date);
}

export function formatLocaleNumber(locale: SupportedLocale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_META[locale].tag, options).format(value);
}

export function formatLocaleCurrency(locale: SupportedLocale, amount: number, currency: string): string {
  return formatLocaleNumber(locale, amount, { style: "currency", currency });
}
