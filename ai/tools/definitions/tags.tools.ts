import { tagsService } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";

export const tagsListAvailableTool = defineTool({
  name: "tags_list_available",
  description: "List canonical and user tags before inventing chips. Prefer existing slugs and never exceed three attribute chips.",
  inputSchema: z.object({
    search: z.string().trim().optional().describe("Optional tag name or slug search."),
    category: z.enum(["dietary", "nutrition", "prep", "flavor", "custom"]).optional()
      .describe("Optional tag category."),
  }).strict(),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: (input, context) => tagsService.listAvailable(context.userId, input),
});
