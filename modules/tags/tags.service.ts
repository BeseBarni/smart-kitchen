import { err, ok, type AppError, type Result } from "@app/shared";
import type { RawTagInput, TagDto } from "./tags.schema";
import { findMatchingTag, insertCustomTag, listTags } from "./tags.repo";

export const MAX_ATTRIBUTE_CHIPS = 3;

export function normalizeTagSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function listAvailable(
  userId: string,
  filters: { search?: string; category?: RawTagInput["category"] } = {},
): Promise<Result<TagDto[], AppError>> {
  const rows = await listTags(userId, filters);
  return ok(rows.map((row) => ({ ...row, i18nKey: row.i18nKey ?? null })));
}

export async function resolveOrCreateTags(
  userId: string,
  rawTags: RawTagInput[],
  maxCount = MAX_ATTRIBUTE_CHIPS,
): Promise<Result<TagDto[], AppError>> {
  const resolved: TagDto[] = [];
  const seen = new Set<string>();
  for (const raw of rawTags.slice(0, Math.max(0, Math.min(maxCount, MAX_ATTRIBUTE_CHIPS)))) {
    const slug = normalizeTagSlug(raw.slug ?? raw.label);
    if (!slug) continue;
    const existing = await findMatchingTag(userId, slug, raw.label);
    const row = existing ?? await insertCustomTag(userId, { ...raw, slug });
    if (!row || seen.has(row.slug)) continue;
    seen.add(row.slug);
    resolved.push({ ...row, i18nKey: row.i18nKey ?? null });
  }
  return ok(resolved);
}
