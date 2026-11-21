import { formatLocaleNumber, resolveText } from "../../../lib/i18n/orchestrator";
import { LOCALE_META, type SupportedLocale } from "../../../lib/i18n/types";

const DAY = 86_400_000;

export function todayLocal(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function isValidDate(value: string): boolean {
  return parseDate(value) !== null;
}

export function daysUntil(value: string, asOf: string): number {
  const date = parseDate(value);
  const today = parseDate(asOf);
  if (!date || !today) throw new Error("Invalid inventory date.");
  return Math.round((date.getTime() - today.getTime()) / DAY);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  if (!date) throw new Error("Invalid inventory date.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(value: string, months: number): string {
  const date = parseDate(value);
  if (!date) throw new Error("Invalid inventory date.");
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export function freshnessLabel(days: number, locale: SupportedLocale = "en"): string {
  if (days < 0) {
    const count = Math.abs(days);
    const key = new Intl.PluralRules(LOCALE_META[locale].tag).select(count) === "one" ? "inventory.expiredOne" : "inventory.expiredOther";
    return resolveText(locale, key, { count: formatLocaleNumber(locale, count) });
  }
  if (days === 0) return resolveText(locale, "inventory.expiresToday");
  if (days === 1) return resolveText(locale, "inventory.expiresTomorrow");
  return resolveText(locale, "inventory.daysLeft", { count: formatLocaleNumber(locale, days) });
}
