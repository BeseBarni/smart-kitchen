import { nutritionTargetChangesSchema } from "@app/modules/schemas";
import { defineTool, toolOk } from "./tool.types";

export const profileUpdateTargetsTool = defineTool({
  name: "profile_update_targets",
  description: "Propose explicit daily nutrition target changes for the user to review and confirm. This does not update the profile.",
  inputSchema: nutritionTargetChangesSchema,
  outputSchema: nutritionTargetChangesSchema,
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async (input) => toolOk(input),
  toUiDirective: (targets) => ({ component: "profile_targets_confirmation", targets }),
});
