export function numericToNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export function numberToNumeric(value: number): string;
export function numberToNumeric(value: number | undefined): string | undefined;
export function numberToNumeric(value: number | null | undefined): string | null | undefined;
export function numberToNumeric(value: number | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : String(value);
}
