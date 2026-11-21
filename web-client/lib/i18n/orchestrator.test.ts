import assert from "node:assert/strict";
import test from "node:test";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { hu } from "./dictionaries/hu";
import { formatLocaleNumber, resolveText } from "./orchestrator";
import { SUPPORTED_LOCALES, type TranslationKey, type WidenStrings } from "./types";

const shape: WidenStrings<typeof en> = hu;
void shape;
// @ts-expect-error A locale cannot omit required domains.
const missing: WidenStrings<typeof en> = { common: en.common };
void missing;
// @ts-expect-error Unknown translation keys are rejected.
const unknown: TranslationKey = "common.notAKey";
void unknown;

function keys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]: [string, unknown]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : keys(child as object, path);
  });
}

function texts(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]: [string, unknown]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [[path, child]] : Object.entries(texts(child as object, path));
  }));
}

test("dictionaries have identical leaf keys", () => {
  assert.deepEqual(keys(hu).sort(), keys(en).sort());
  assert.deepEqual(keys(es).sort(), keys(en).sort());
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of keys(en)) {
      assert.ok(resolveText(locale, key as TranslationKey, {
        count: 2, name: "test", unit: "g", storage: "test", value: 1, target: 3,
        protein: 1, carbs: 1, fat: 1, fiber: 1, calories: 1, type: "test",
        currency: "EUR", names: "test", action: "test", items: "test", id: "1",
        title: "test", description: "test",
      }));
    }
  }
});

test("translations use the same named placeholders", () => {
  const master = texts(en);
  for (const translation of [hu, es]) {
    const localized = texts(translation);
    for (const [key, value] of Object.entries(master)) {
      const placeholders = (text: string): string[] => [...text.matchAll(/\{\{\w+\}\}/g)].map((match) => match[0]).sort();
      assert.deepEqual(placeholders(localized[key] ?? ""), placeholders(value), key);
    }
  }
});

test("interpolation treats replacement values literally", () => {
  assert.equal(resolveText("en", "inventory.discardItem", { name: "$& {{count}}" }), "Discard $& {{count}}");
  assert.equal(resolveText("invalid" as "en", "common.close"), "Close");
});

test("numbers use the selected locale", () => {
  assert.equal(formatLocaleNumber("en", 1234.5), "1,234.5");
  assert.equal(formatLocaleNumber("es", 1234.5), "1234,5");
});
