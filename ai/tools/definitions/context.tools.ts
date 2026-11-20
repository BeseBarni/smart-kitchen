import { mealLogService, profileService } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";

export const profileGetTool = defineTool({
  name: "profile_get",
  description: "Read the user's dietary preferences, nutrition targets, currency, and measurement system.",
  inputSchema: z.object({}).strict().describe("No input is required."),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: (_input, context) => profileService.getOrCreateProfile(context.userId),
});

export const mealLogsDailySummaryTool = defineTool({
  name: "meal_logs_get_daily_summary",
  description: "Read the user's consumed nutrition and cost totals for a calendar date.",
  inputSchema: z.object({
    date: z.iso.date().optional().describe("Calendar date (YYYY-MM-DD); defaults to today in UTC."),
  }).strict(),
  annotations: { readOnlyHint: true },
  execute: ({ date }, context) =>
    mealLogService.getDailySummary(context.userId, { date: date ?? new Date().toISOString().slice(0, 10) }),
});

export const contextTools = [profileGetTool, mealLogsDailySummaryTool] as const;
