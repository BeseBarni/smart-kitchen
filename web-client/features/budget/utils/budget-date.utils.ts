export function toLocalMonthRange(yearMonth: string): { from: string; to: string } {
  const [year = 1970, month = 1] = yearMonth.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function monthInfo(yearMonth: string): { daysInMonth: number; currentDay: number; progressPercent: number } {
  const [year = 1970, month = 1] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` === yearMonth
    ? now.getDate()
    : daysInMonth;
  return { daysInMonth, currentDay: current, progressPercent: Math.round((current / daysInMonth) * 100) };
}

export function formatYearMonth(yearMonth: string, locale: string): string {
  const [year = 1970, month = 1] = yearMonth.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function receiptDateGroup(purchasedAt: string, locale: string, todayKey: string, yesterdayKey: string): string {
  const date = new Date(purchasedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (local.getTime() === today.getTime()) return todayKey;
  if (local.getTime() === yesterday.getTime()) return yesterdayKey;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
}
