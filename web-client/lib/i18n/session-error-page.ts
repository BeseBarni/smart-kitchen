import { resolveText } from "./orchestrator";
import { SUPPORTED_LOCALES } from "./types";

export function sessionErrorPage(): string {
  const messages = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, {
    error: resolveText(locale, "auth.verifyError"),
    storage: resolveText(locale, "settings.storageError"),
  }]));
  const payload = JSON.stringify(messages).replace(/</g, "\\u003c");
  const english = resolveText("en", "auth.verifyError")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><p id="error" role="alert">${english}</p><p id="storage" role="status" hidden></p>
<script>
const messages = ${payload};
try {
  const saved = localStorage.getItem("app-language-preference");
  const locale = saved ? JSON.parse(saved)?.state?.locale : "en";
  if (!Object.hasOwn(messages, locale)) throw new Error("Invalid saved language");
  document.documentElement.lang = locale;
  document.getElementById("error").textContent = messages[locale].error;
} catch (error) {
  console.error("Language preference could not be restored:", error);
  const warning = document.getElementById("storage");
  warning.textContent = messages.en.storage;
  warning.hidden = false;
}
</script></body></html>`;
}
