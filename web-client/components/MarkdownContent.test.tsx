import assert from "node:assert/strict";
import test from "node:test";
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageBubble } from "../features/chat/components/MessageBubble";
import { RecipeDetailsSheet } from "../features/recipes/components/RecipeDetailsSheet";
import { RecipeDetailModal } from "../features/recipes/components/RecipeDetailModal";
import type { Recipe } from "../features/recipes/types";
import { MarkdownContent } from "./MarkdownContent";
import { SheetDescription } from "./ui/sheet";
import { resolveText } from "../lib/i18n/orchestrator";

test("renders GitHub-flavored Markdown as semantic, read-only content", () => {
  const html = renderToStaticMarkup(<MarkdownContent text={[
    "## Dinner",
    "",
    "**Fresh** ~~old~~",
    "",
    "- [x] Chop",
    "- [ ] Cook",
    "",
    "| Item | Amount |",
    "| --- | --- |",
    "| Rice | 2 cups |",
    "",
    "```",
    "heat pan",
    "```",
  ].join("\n")} />);

  assert.match(html, /<h2>Dinner<\/h2>/);
  assert.match(html, /<strong>Fresh<\/strong>/);
  assert.match(html, /<del>old<\/del>/);
  assert.match(html, /<input(?=[^>]*type="checkbox")(?=[^>]*disabled="")[^>]*>/);
  assert.match(html, /<table[^>]*>[\s\S]*<th[^>]*>Item<\/th>/);
  assert.match(html, /<pre[^>]*>[\s\S]*<code>heat pan/);
});

test("blocks raw HTML, unsafe links, and image fetches", () => {
  const html = renderToStaticMarkup(<MarkdownContent text={[
    '<img src="https://example.com/raw.png" onerror="alert(1)">',
    "",
    "[unsafe](javascript:alert(1)) [safe](https://example.com)",
    "",
    "![Food photo](https://example.com/photo.png)",
  ].join("\n")} />);

  assert.doesNotMatch(html, /<img|onerror|javascript:|photo\.png|raw\.png/i);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, />Food photo<\/span>/);
});

test("formats streamed assistant text and leaves user messages literal", () => {
  const message = { id: "1", createdAt: "2026-01-01T10:00:00.000Z" };
  const partial = renderToStaticMarkup(<MessageBubble message={{ ...message, role: "assistant", text: "**Fresh" }} />);
  const complete = renderToStaticMarkup(<MessageBubble message={{ ...message, role: "assistant", text: "**Fresh**" }} />);
  const user = renderToStaticMarkup(<MessageBubble message={{ ...message, role: "user", text: "**Fresh**" }} />);

  assert.match(partial, /\*\*Fresh/);
  assert.match(complete, /<strong>Fresh<\/strong>/);
  assert.match(complete, /Assistant:/);
  assert.match(user, /\*\*Fresh\*\*/);
  assert.doesNotMatch(user, /<strong>/);
  assert.match(user, /You:/);
});

test("recipe details render Markdown only for AI-generated recipes", () => {
  const recipe: Recipe = {
    id: "recipe-1", userId: "user-1", title: "Soup", description: "**Warm** soup",
    instructions: ["**Mix** ingredients"], source: "ai_skill", ingredients: [],
    imageUrl: null, prepTimeMin: null, cookTimeMin: null, servings: 1,
    isFreezerFriendly: false, caloriesPerServing: null, proteinPerServing: null,
    carbsPerServing: null, fatPerServing: null, fiberPerServing: null, costPerServing: null, currency: "USD",
    shareToken: null, sharedAt: null,
    createdAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T10:00:00.000Z",
  };
  const noop = (): void => {};
  const collect = (node: ReactNode): Array<{ type: unknown; text?: string; children?: ReactNode }> => {
    return Children.toArray(node).flatMap((child) => {
      if (!isValidElement<{ text?: string; children?: ReactNode }>(child)) return [];
      return [{ type: child.type, ...child.props }, ...collect(child.props.children)];
    });
  };
  const elements = (source: Recipe["source"]) => {
    let result: ReturnType<typeof collect> = [];
    function Capture(): null {
      const sheet = RecipeDetailsSheet({
        recipe: { ...recipe, source }, open: true, loading: false,
        onClose: noop, onRetry: noop, onEdit: noop, onDelete: noop, onCook: noop,
      });
      result = collect(RecipeDetailModal(sheet.props));
      return null;
    }
    renderToStaticMarkup(<Capture />);
    return result;
  };
  const ai = elements("ai_skill");
  assert.deepEqual(ai.filter((item) => item.type === MarkdownContent).map((item) => item.text),
    ["**Warm** soup", "**Mix** ingredients"]);
  assert.equal(ai.find((item) => item.type === SheetDescription)?.children, resolveText("en", "recipes.detailsDescription"));
  assert.equal(elements("manual").filter((item) => item.type === MarkdownContent).length, 0);
});
