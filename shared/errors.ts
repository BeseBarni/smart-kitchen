export type AppErrorCode =
  | "ITEM_NOT_FOUND"
  | "INSUFFICIENT_QUANTITY"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "ACCOUNT_NOT_FOUND";

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}
