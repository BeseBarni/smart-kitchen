import { ApiClientError } from "@/lib/api-client";
import { getText } from "./use-text";
import type { TranslationKey } from "./types";

export function getErrorText(error: unknown, fallback: TranslationKey): string {
  if (error instanceof ApiClientError && error.code) return getText(`errors.${error.code}`);
  console.error("Request failed:", error);
  return getText(fallback);
}
