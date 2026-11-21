import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CalorieHeroCard } from "./CalorieHeroCard";
import { MacroProgressRow } from "./MacroProgressRow";

test("tracker distinguishes missing targets, incomplete data and exceeding targets", () => {
  const noTarget = renderToStaticMarkup(<CalorieHeroCard calories={0} target={null} incomplete={false} onEdit={() => {}} />);
  const over = renderToStaticMarkup(<CalorieHeroCard calories={2200} target={2000} incomplete={false} onEdit={() => {}} />);
  const incomplete = renderToStaticMarkup(<MacroProgressRow macros={[{ label: "Fiber", value: 5, target: 20, incomplete: true }]} />);
  assert.match(noTarget, /Not set/);
  assert.match(over, /Over target/);
  assert.match(incomplete, /incomplete/);
  assert.match(incomplete, /May include estimates/);
});
