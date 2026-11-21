import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileTargetsConfirmation } from "./ProfileTargetsConfirmation";

test("target proposals show exact changes and require an explicit confirmation", () => {
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileTargetsConfirmation targets={{ dailyCalorieTarget: 2000, dailyFiberG: null }} disabled={false} />
    </QueryClientProvider>,
  );
  assert.match(markup, /Calories:.*2000 kcal/);
  assert.match(markup, /Fiber:.*Unset/);
  assert.match(markup, /Confirm and update targets/);
  assert.doesNotMatch(markup, /Protein:/);
});
