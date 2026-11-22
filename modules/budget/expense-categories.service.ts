import { err, ok, type AppError, type Result } from "@app/shared";
import { findAccessibleByIds, listAvailable as listAvailableRows } from "./expense-categories.repo";
import type { ExpenseCategoryDto } from "./expense-categories.schema";

function toDto(row: Awaited<ReturnType<typeof listAvailableRows>> extends Result<infer T, AppError>
  ? T extends Array<infer R> ? R : never
  : never): ExpenseCategoryDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAvailable(userId: string): Promise<Result<ExpenseCategoryDto[], AppError>> {
  const rows = await listAvailableRows(userId);
  if (!rows.success) return err(rows.error);
  return ok(rows.data.map(toDto));
}

export async function assertCategoriesAccessible(
  userId: string,
  categoryIds: string[],
): Promise<Result<true, AppError>> {
  const uniqueIds = [...new Set(categoryIds)];
  const rows = await findAccessibleByIds(userId, uniqueIds);
  if (!rows.success) return err(rows.error);
  if (rows.data.length !== uniqueIds.length) {
    return err({ code: "VALIDATION_ERROR", message: "One or more categories are not accessible." });
  }
  return ok(true);
}
