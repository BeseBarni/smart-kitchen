"use client";

import { MarkdownContent } from "@/components/MarkdownContent";
import { useText } from "@/lib/i18n";

export function RecipeAssistantResponse({ response }: { response?: string | null }): React.JSX.Element | null {
  const { t } = useText();
  if (!response) return null;
  return (
    <details className="rounded-2xl border px-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-title-sm">{t("chat.fullResponse")}</summary>
      <MarkdownContent text={response} className="pb-3 text-body-sm" />
    </details>
  );
}
