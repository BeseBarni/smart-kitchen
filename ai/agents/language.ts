import type { AgentContext } from "./agent.types";

export function languageReminder(locale: AgentContext["locale"]): string {
  const languages = { en: "English", hu: "Hungarian", es: "Spanish" } as const;
  return `Respond in ${languages[locale]}, the user's selected app language. Write all newly generated user-facing natural language, including explanations, titles, suggestions, and instructions, in this language. Preserve quoted or source-provided text, identifiers, and schema values unchanged.`;
}
