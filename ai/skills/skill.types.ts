import { err, ok, type AppError, type Result } from "@app/shared";
import type { z } from "zod";
import { generateStructuredWithUsage } from "../core/llm.client";
import type { AgentStreamEvent } from "../core/stream.types";
import type { AgentContext } from "../agents/agent.types";
import { languageReminder } from "../agents/language";

export type SkillRun<TInput, TOutput> = {
  input: TInput;
  output: TOutput;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
};

export type SkillDefinition<
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
> = {
  name: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  execute(
    input: unknown,
    emit: (event: AgentStreamEvent) => void,
    locale: AgentContext["locale"],
  ): Promise<Result<SkillRun<z.output<TInputSchema>, z.output<TOutputSchema>>, AppError>>;
};

export function defineSkill<TInputSchema extends z.ZodType, TOutputSchema extends z.ZodType>(
  spec: {
    name: string;
    inputSchema: TInputSchema;
    outputSchema: TOutputSchema;
    system: string;
    modelTier: "fast" | "reasoning";
    prompt: (input: z.output<TInputSchema>) => string;
  },
): SkillDefinition<TInputSchema, TOutputSchema> {
  return {
    name: spec.name,
    inputSchema: spec.inputSchema,
    outputSchema: spec.outputSchema,
    execute: async (input, emit, locale) => {
      const parsed = spec.inputSchema.safeParse(input);
      if (!parsed.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((issue) => issue.message).join("; "),
        });
      }
      const started = Date.now();
      emit({
        type: "agent_status",
        agent: "recipe_architect",
        status: "running_skill",
        label: `Running ${spec.name}`,
      });
      const generated = await generateStructuredWithUsage({
        schema: spec.outputSchema,
        system: `${spec.system}\n${languageReminder(locale)}`,
        prompt: spec.prompt(parsed.data),
        modelTier: spec.modelTier,
      });
      if (!generated.success) return err(generated.error);
      const latencyMs = Date.now() - started;
      emit({ type: "skill_completed", skillName: spec.name, latencyMs });
      return ok({
        input: parsed.data,
        output: generated.data.output,
        usage: generated.data.usage,
        latencyMs,
      });
    },
  };
}
