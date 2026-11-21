export type StorageLocation = "fridge" | "freezer" | "pantry";
export type ShelfLifeDays = Partial<Record<StorageLocation, number | null>>;

export function estimatedExpiry(
  shelfLifeDays: ShelfLifeDays | undefined,
  location: StorageLocation,
  from: Date,
): Date | null {
  const days = shelfLifeDays?.[location];
  if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) return null;
  return new Date(from.getTime() + days * 86_400_000);
}
