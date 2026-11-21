import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ChatTurn } from "../types";
import { ChatMessageList } from "./ChatMessageList";

function turn(withRecipe: boolean): ChatTurn {
  return {
    id: "turn",
    assistantMessage: { id: "answer", role: "assistant", text: "Ingredients: secret test ingredient.", createdAt: "2026-01-01T10:00:00Z" },
    toolSteps: [],
    activeStatus: null,
    uiDirectives: withRecipe ? [{
      component: "recipe_preview_card",
      status: "draft",
      recipe: { title: "Soup", description: "", servings: 2, ingredients: [], instructions: [] },
      canSave: true,
      canCookAndStock: false,
    }] : [],
  };
}

function render(withRecipe: boolean, streaming: boolean): string {
  return renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><ChatMessageList turns={[turn(withRecipe)]} activeStatus={null} onReply={() => {}} streaming={streaming} /></QueryClientProvider>);
}

test("buffers streaming text before the recipe directive arrives", () => {
  const markup = render(false, true);
  assert.ok(markup.includes("Preparing response"));
  assert.ok(!markup.includes("secret test ingredient"));
});

test("shows the card, not recipe turn prose, after completion", () => {
  const markup = render(true, false);
  assert.ok(markup.includes("View recipe and macros"));
  assert.ok(markup.includes("Save recipe"));
  assert.ok(!markup.includes("secret test ingredient"));
});

test("saved recipe cards show stocking controls without another save action", () => {
  const saved = turn(true);
  const directive = saved.uiDirectives[0];
  assert.ok(directive && directive.component === "recipe_preview_card");
  directive.status = "saved";
  directive.canSave = false;
  directive.canCookAndStock = true;
  directive.recipe.id = "saved-recipe";
  const markup = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><ChatMessageList turns={[saved]} activeStatus={null} onReply={() => {}} streaming={false} /></QueryClientProvider>);
  assert.ok(markup.includes("Cook &amp; stock"));
  assert.ok(markup.includes("Portions"));
  assert.ok(markup.includes("Storage"));
  assert.ok(!markup.includes("Save recipe"));
});

test("preserves completed text-only messages", () => {
  assert.ok(render(false, false).includes("secret test ingredient"));
});

test("shows AI-generated progress instead of generic tool status", () => {
  const activeStatus = {
    type: "agent_status" as const, agent: "orchestrator" as const,
    status: "running_tool" as const, label: "Kneading the dough 🍞", source: "ai" as const,
  };
  const markup = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><ChatMessageList turns={[turn(false)]} activeStatus={activeStatus} onReply={() => {}} streaming /></QueryClientProvider>);
  assert.match(markup, /Kneading the dough 🍞/);
});

test("shows a rejected message without displaying an error in the conversation", () => {
  const rejected = turn(false);
  rejected.userMessage = {
    id: "rejected", role: "user", text: "My message", createdAt: "2026-01-01T10:00:00Z", rejected: true,
  };
  rejected.assistantMessage.text = "";
  const markup = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><ChatMessageList turns={[rejected]} activeStatus={null} onReply={() => {}} streaming={false} /></QueryClientProvider>);
  assert.match(markup, /My message/);
  assert.match(markup, /Message rejected/);
  assert.doesNotMatch(markup, /role="alert"/);
});
