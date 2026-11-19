import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export function getChatModel(): LanguageModel {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required.");
  const modelId = process.env.AI_MODEL ?? "gemini-2.5-flash";
  return createGoogleGenerativeAI({ apiKey })(modelId);
}
