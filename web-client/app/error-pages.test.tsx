import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorScreen } from "../components/ErrorScreen";
import { resolveText } from "../lib/i18n/orchestrator";
import NotFound from "./not-found";

test("error and not-found screens use the English server-rendered text", () => {
  const missing = renderToStaticMarkup(<NotFound />);
  assert.ok(missing.includes(resolveText("en", "common.notFound")));
  assert.ok(missing.includes(resolveText("en", "common.backToChat")));
  const failure = renderToStaticMarkup(<ErrorScreen error={new Error("private details")} reset={() => {}} />);
  assert.ok(failure.includes(resolveText("en", "common.error")));
  assert.ok(failure.includes(resolveText("en", "common.retry")));
  assert.doesNotMatch(failure, /private details/);
});
