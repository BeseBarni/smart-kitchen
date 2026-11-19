export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}
