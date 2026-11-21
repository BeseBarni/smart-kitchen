"use client";

import { useMemo } from "react";
import { useStore } from "zustand";
import { languageStore } from "./language.store";
import { formatLocaleCurrency, formatLocaleDate, formatLocaleNumber, resolveText } from "./orchestrator";
import type { TextParams, TranslationKey } from "./types";

export function useLanguageStore<T>(selector: (state: ReturnType<typeof languageStore.getState>) => T): T {
  return useStore(languageStore, selector);
}

export function useText() {
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);
  return useMemo(() => ({
    locale,
    setLocale,
    t: (key: TranslationKey, params?: TextParams) => resolveText(locale, key, params),
    formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => formatLocaleDate(locale, date, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatLocaleNumber(locale, value, options),
    formatCurrency: (amount: number, currency: string) => formatLocaleCurrency(locale, amount, currency),
  }), [locale, setLocale]);
}

export function getText(key: TranslationKey, params?: TextParams): string {
  const locale = typeof window === "undefined" ? "en" : languageStore.getState().locale;
  return resolveText(locale, key, params);
}
