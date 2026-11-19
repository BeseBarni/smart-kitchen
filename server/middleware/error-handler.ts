import type { Context, TypedResponse } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { JSONParsed } from "hono/utils/types";
import type { AppError, Result } from "@app/shared";

const statusByCode: Record<AppError["code"], ContentfulStatusCode> = {
  ITEM_NOT_FOUND: 404,
  INSUFFICIENT_QUANTITY: 409,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  ACCOUNT_NOT_FOUND: 404,
};

export function statusForError(error: AppError): ContentfulStatusCode {
  return statusByCode[error.code];
}

export type ApiErrorBody = { error: AppError };
export type ApiJsonResponse<T> = Response &
  TypedResponse<JSONParsed<T | ApiErrorBody>, ContentfulStatusCode, "json">;

export function resultToResponse<T>(
  context: Context,
  result: Result<T, AppError>,
  successStatus: ContentfulStatusCode = 200,
): ApiJsonResponse<T> {
  return result.success
    ? context.json(result.data, successStatus)
    : context.json({ error: result.error }, statusForError(result.error));
}

export function errorResponse(
  context: Context,
  error: AppError,
): Response & TypedResponse<JSONParsed<ApiErrorBody>, ContentfulStatusCode, "json"> {
  return context.json({ error }, statusForError(error));
}
