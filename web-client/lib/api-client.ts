import type { AppType } from "@app/server";
import type { AppError, AppErrorCode } from "@app/shared";
import { hc } from "hono/client";
import { z } from "zod";

type ApiErrorBody = { error: AppError };
const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum([
      "ITEM_NOT_FOUND",
      "INSUFFICIENT_QUANTITY",
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "CONFLICT",
      "INTERNAL_ERROR",
      "ACCOUNT_NOT_FOUND",
    ]),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: AppErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return apiErrorBodySchema.safeParse(value).success;
}

export const apiClient = hc<AppType>(process.env.NEXT_PUBLIC_API_URL ?? "", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: "include" }),
});

function createApiClientError(status: number, body: unknown): ApiClientError {
  const error = isApiErrorBody(body) ? body.error : undefined;
  return new ApiClientError(
    error?.message ?? (status === 401 ? "Please sign in again." : "The request failed."),
    status,
    error?.code ?? (status === 401 ? "UNAUTHORIZED" : undefined),
    error?.details,
  );
}

export async function throwApiResponseError(response: Response): Promise<never> {
  throw createApiClientError(response.status, await response.json());
}

export async function unwrapApiResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok || isApiErrorBody(body)) {
    throw createApiClientError(response.status, body);
  }
  return schema.parse(body);
}
