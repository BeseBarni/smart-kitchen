import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AttachmentPickerSheet } from "./AttachmentPickerSheet";

test("keeps camera and library inputs mounted when the picker closes", () => {
  const render = (open: boolean) => renderToStaticMarkup(
    <AttachmentPickerSheet open={open} onClose={() => {}} onFiles={() => {}} />,
  );
  const opened = render(true);
  const closed = render(false);
  for (const markup of [opened, closed]) {
    assert.equal((markup.match(/type="file"/g) ?? []).length, 2);
    assert.match(markup, /capture="environment"/);
    assert.match(markup, /multiple=""/);
  }
  assert.match(opened, /role="dialog"/);
  assert.doesNotMatch(closed, /role="dialog"/);
});
