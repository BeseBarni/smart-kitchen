import { LOCALE_META, type SupportedLocale } from "../../../lib/i18n/types";

export function formatChatTime(timestamp: string, locale: SupportedLocale = "en"): string | null {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat(LOCALE_META[locale].tag, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
