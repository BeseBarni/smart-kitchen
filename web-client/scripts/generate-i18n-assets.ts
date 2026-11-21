import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveText } from "../lib/i18n/orchestrator";
import { SUPPORTED_LOCALES } from "../lib/i18n/types";

const publicDir = resolve(process.cwd(), "public");
const offline = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, {
  title: resolveText(locale, "offline.title"),
  heading: resolveText(locale, "offline.heading"),
  description: resolveText(locale, "offline.description"),
  retry: resolveText(locale, "offline.retry"),
  storageError: resolveText(locale, "offline.storageError"),
}]));

for (const locale of SUPPORTED_LOCALES) {
  const manifest = {
    name: resolveText(locale, "common.installName"),
    short_name: resolveText(locale, "common.appName"),
    description: resolveText(locale, "common.appDescription"),
    start_url: "/chat", scope: "/", display: "standalone",
    background_color: "#f8f9fa", theme_color: "#f8f9fa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
  writeFileSync(resolve(publicDir, `manifest.${locale}.webmanifest`), `${JSON.stringify(manifest, null, 2)}\n`);
}

const english = offline.en;
if (!english) throw new Error("Missing English offline text.");
const payload = JSON.stringify(offline).replace(/</g, "\\u003c");
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f9f9ff">
    <title>${english.title}</title>
    <style>
      body { margin: 0; background: #f9f9ff; color: #141b2b; font-family: system-ui, sans-serif; }
      main { box-sizing: border-box; max-width: 430px; margin: auto; padding: 4rem 1.5rem; }
      a { display: inline-block; padding: 0.8rem 1rem; border-radius: 0.75rem; background: #006948; color: #fff; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1 id="heading">${english.heading}</h1>
      <p id="description">${english.description}</p>
      <a id="retry" href="/chat">${english.retry}</a>
      <p id="storage-error" role="status" hidden></p>
    </main>
    <script>
      const translations = ${payload};
      try {
        const saved = localStorage.getItem("app-language-preference");
        const locale = saved ? JSON.parse(saved)?.state?.locale : "en";
        if (!Object.hasOwn(translations, locale)) throw new Error("Invalid saved language");
        document.documentElement.lang = locale;
        const text = translations[locale];
        document.title = text.title;
        for (const id of ["heading", "description", "retry"]) document.getElementById(id).textContent = text[id];
      } catch (error) {
        console.error("Language preference could not be restored:", error);
        const warning = document.getElementById("storage-error");
        warning.textContent = translations.en.storageError;
        warning.hidden = false;
      }
    </script>
  </body>
</html>
`;
writeFileSync(resolve(publicDir, "offline.html"), html);
