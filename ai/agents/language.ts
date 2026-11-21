import type { AgentContext } from "./agent.types";

export function languageReminder(locale: AgentContext["locale"]): string {
  const languages = { en: "English", hu: "Hungarian", es: "Spanish" } as const;
  return `Respond in ${languages[locale]}, the user's selected app language. Keep identifiers and schema values unchanged.`;
}
