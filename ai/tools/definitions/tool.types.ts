import { err, ok, type AppError, type Result } from "@app/shared";
import type { z } from "zod";
import type { AgentName, AgentStreamEvent } from "../../core/stream.types";
import type { UiDirective } from "../../core/ui.types";
import type { chatService } from "@app/modules";

export type LedgerItem = Parameters<typeof chatService.appendItems>[2][number];

export type ToolContext = {
  userId: string;
  agent: AgentName;
  emit: (event: AgentStreamEvent) => void;
  recordLedger: (items: LedgerItem[]) => Promise<void>;
};

export type ToolOutcome =
  | { success: true; data: unknown; uiDirective?: UiDirective }
  | { success: false; error: Pick<AppError, "code" | "message"> };

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  // Model-facing schemas may be broader; execute always validates inputSchema.
  modelInputSchema?: z.ZodType;
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
  invalidateDomains?: Array<"inventory" | "recipes" | "ingredients" | "meal-logs" | "profile" | "budget" | "receipts" | "merchants">;
  toUiDirective?: (result: unknown) => UiDirective;
  execute: (input: unknown, context: ToolContext) => Promise<ToolOutcome>;
};

type ToolSpec<TSchema extends z.ZodType, TOutput> = Omit<
  ToolDefinition,
  "inputSchema" | "execute" | "toUiDirective"
> & {
  inputSchema: TSchema;
  outputSchema?: z.ZodType<TOutput>;
  execute: (input: z.output<TSchema>, context: ToolContext) => Promise<Result<TOutput, AppError>>;
  toUiDirective?: (output: TOutput) => UiDirective;
};

export function defineTool<TSchema extends z.ZodType, TOutput>(
  spec: ToolSpec<TSchema, TOutput>,
): ToolDefinition {
  if (spec.toUiDirective && !spec.outputSchema) {
    throw new Error(`Tool ${spec.name} must declare an output schema for its UI directive mapper.`);
  }
  const mapper = spec.toUiDirective;
  const outputSchema = spec.outputSchema;
  const toUiDirective = mapper && outputSchema
    ? (result: unknown) => mapper(outputSchema.parse(result))
    : undefined;
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    modelInputSchema: spec.modelInputSchema,
    annotations: spec.annotations,
    invalidateDomains: spec.invalidateDomains,
    toUiDirective,
    execute: async (input, context) => {
      const parsed = spec.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((issue) => issue.message).join("; "),
          },
        };
      }
      const result = await spec.execute(parsed.data, context);
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: result.data };
    },
  };
}

export function toolOk<T>(data: T): Result<T, never> {
  return ok(data);
}

export function toolError(error: AppError): Result<never, AppError> {
  return err(error);
}
