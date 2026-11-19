import assert from "node:assert/strict";
import test from "node:test";
import { getConversation, sendMessage } from "./chat.mock";

test("mock conversation is isolated and persists demo mutations", async () => {
  const first = await getConversation();
  assert.equal(first.messages.length, 2);
  const firstMessage = first.messages[0];
  assert.ok(firstMessage);
  Object.assign(firstMessage, { text: "changed" });
  assert.notEqual((await getConversation()).messages[0]?.text, "changed");

  const sent = await sendMessage({ text: "  soup  " });
  assert.equal(sent.text, "soup");
  assert.deepEqual((await getConversation()).messages.at(-1), sent);
  await assert.rejects(sendMessage({ text: "   " }), /cannot be empty/);
  assert.equal((await getConversation()).messages.length, 3);
});
