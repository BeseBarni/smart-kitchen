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

export function freshnessLabel(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)} ${days === -1 ? "day" : "days"} ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days} days left`;
}

export function containerLabel(container: "glass" | "bag" | "box"): string {
  return { glass: "Pyrex Glass", bag: "Vacuum Bag", box: "Meal Box" }[container];
}
