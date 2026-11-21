export function localDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid calendar date.");
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) throw new Error("Invalid calendar date.");
  const result = new Date(0);
  result.setFullYear(year, month - 1, day);
  result.setHours(0, 0, 0, 0);
  if (localDate(result) !== value) throw new Error("Invalid calendar date.");
  return result;
}

export function addLocalDays(value: string, days: number): string {
  const date = parseLocalDay(value);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

export function toLocalDayRange(value: string): { from: string; to: string } {
  const start = parseLocalDay(value);
  const end = parseLocalDay(addLocalDays(value, 1));
  return { from: start.toISOString(), to: end.toISOString() };
}

export function dateLabel(value: string, now = new Date()): string {
  const today = localDate(now);
  if (value === today) return "Today";
  if (value === addLocalDays(today, -1)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(parseLocalDay(value));
}
