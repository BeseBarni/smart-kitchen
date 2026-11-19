export type Result<TData, TError> =
  | { readonly success: true; readonly data: TData }
  | { readonly success: false; readonly error: TError };

export const ok = <TData>(data: TData): Result<TData, never> => ({
  success: true,
  data,
});

export const err = <TError>(error: TError): Result<never, TError> => ({
  success: false,
  error,
});

export function isOk<TData, TError>(
  result: Result<TData, TError>,
): result is { readonly success: true; readonly data: TData } {
  return result.success;
}

export function isErr<TData, TError>(
  result: Result<TData, TError>,
): result is { readonly success: false; readonly error: TError } {
  return !result.success;
}
