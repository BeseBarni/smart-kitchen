import type { en } from "./dictionaries/en";

export const SUPPORTED_LOCALES = ["en", "hu", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_META: Record<SupportedLocale, { label: string; tag: string }> = {
  en: { label: "English", tag: "en-US" },
  hu: { label: "Magyar", tag: "hu-HU" },
  es: { label: "Español", tag: "es-ES" },
};

export type WidenStrings<T> = T extends string ? string : { [K in keyof T]: WidenStrings<T[K]> };
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`
}[keyof T & string];
export type TranslationKey = DotPaths<typeof en>;
export type TextParams = Record<string, string | number>;

export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.some((locale) => locale === value);
}
