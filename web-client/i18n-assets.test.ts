import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { resolveText } from "./lib/i18n/orchestrator";
import { sessionErrorPage } from "./lib/i18n/session-error-page";
import { SUPPORTED_LOCALES } from "./lib/i18n/types";

test("offline page restores supported language from local storage", () => {
  const html = readFileSync(resolve("web-client/public/offline.html"), "utf8");
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(script);
  for (const locale of SUPPORTED_LOCALES) {
    const elements = Object.fromEntries(["heading", "description", "retry", "storage-error"].map((id) => [id, { textContent: "", hidden: true }]));
    const document = { documentElement: { lang: "en" }, title: "", getElementById: (id: string) => elements[id] };
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => JSON.stringify({ state: { locale }, version: 0 }) },
      console,
    });
    assert.equal(document.documentElement.lang, locale);
    assert.equal(elements.heading?.textContent, resolveText(locale, "offline.heading"));
    assert.equal(elements.retry?.textContent, resolveText(locale, "offline.retry"));
  }
});

test("session verification failure page uses the saved language", () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(sessionErrorPage())?.[1];
  assert.ok(script);
  for (const locale of SUPPORTED_LOCALES) {
    const elements = { error: { textContent: "" }, storage: { textContent: "", hidden: true } };
    const document = { documentElement: { lang: "en" }, getElementById: (id: keyof typeof elements) => elements[id] };
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => JSON.stringify({ state: { locale }, version: 0 }) },
      console,
    });
    assert.equal(document.documentElement.lang, locale);
    assert.equal(elements.error.textContent, resolveText(locale, "auth.verifyError"));
  }
});

test("localized install assets match the dictionaries", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const manifest: unknown = JSON.parse(readFileSync(resolve(`web-client/public/manifest.${locale}.webmanifest`), "utf8"));
    assert.ok(typeof manifest === "object" && manifest !== null && "name" in manifest && "description" in manifest);
    assert.equal(manifest.name, resolveText(locale, "common.installName"));
    assert.equal(manifest.description, resolveText(locale, "common.appDescription"));
  }
});
