import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMerchantName } from "./merchant-normalize.utils";

test("merchant normalization folds case, whitespace, and diacritics", () => {
  assert.equal(normalizeMerchantName("  ALDI   "), "aldi");
  assert.equal(normalizeMerchantName("Café   Central"), "cafe central");
  assert.equal(normalizeMerchantName("aldi"), normalizeMerchantName("Aldi  "));
});
