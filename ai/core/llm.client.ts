import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  generateObject,
  NoObjectGeneratedError,
  streamText,
  type LanguageModel,
} from "ai";
import { err, ok, type AppError, type Result } from "@app/shared";
import type { z } from "zod";

export const FAST_MODEL = process.env.FAST_MODEL ?? "gemini-3.5-flash-lite";
export const REASONING_MODEL = process.env.REASONING_MODEL ?? "gemini-3.5-flash-lite";

let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | undefined;

function provider(): ReturnType<typeof createGoogleGenerativeAI> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is required.");
  googleProvider ??= createGoogleGenerativeAI({ apiKey });
  return googleProvider;
}

export function getModel(modelId: string): LanguageModel {
  return provider()(modelId);
}

export function getFastModel(): LanguageModel {
  return getModel(FAST_MODEL);
}

export function getReasoningModel(): LanguageModel {
  return getModel(REASONING_MODEL);
}

export function getChatModel(): LanguageModel {
  return getModel(process.env.AI_MODEL ?? FAST_MODEL);
}

export function streamWithTools(options: Parameters<typeof streamText>[0]) {
  return streamText(options);
}

export type StructuredGeneration<T> = {
  output: T;
  usage: { inputTokens: number; outputTokens: number };
};

export async function generateStructuredWithUsage<TSchema extends z.ZodType>(
  input: {
    schema: TSchema;
    prompt: string;
    system?: string;
    model?: LanguageModel;
    modelTier?: "fast" | "reasoning";
  },
): Promise<Result<StructuredGeneration<z.output<TSchema>>, AppError>> {
  const model = input.model ?? (input.modelTier === "reasoning" ? getReasoningModel() : getFastModel());
  let correction: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await generateObject({
        model,
        schema: input.schema,
        system: input.system,
        prompt: correction ? `${input.prompt}\n\nCorrect the prior output: ${correction}` : input.prompt,
      });
      return ok({
        output: input.schema.parse(response.object),
        usage: {
          inputTokens: response.usage.inputTokens ?? 0,
          outputTokens: response.usage.outputTokens ?? 0,
        },
      });
    } catch (error) {
      if (attempt === 0 && NoObjectGeneratedError.isInstance(error)) {
        correction = error.message;
        continue;
      }
      return err({
        code: NoObjectGeneratedError.isInstance(error) ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Structured generation failed.",
      });
    }
  }
  return err({ code: "VALIDATION_ERROR", message: "Structured output could not be validated." });
}

export async function generateStructured<TSchema extends z.ZodType>(
  input: Parameters<typeof generateStructuredWithUsage<TSchema>>[0],
): Promise<Result<z.output<TSchema>, AppError>> {
  const result = await generateStructuredWithUsage(input);
  return result.success ? ok(result.data.output) : err(result.error);
}
