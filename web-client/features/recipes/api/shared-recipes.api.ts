import {
  sharedRecipePublicDtoSchema,
  type SharedRecipePublicDto,
} from "@app/modules/schemas";
import { z } from "zod";

const publicRecipeResponseSchema = z.object({
  data: sharedRecipePublicDtoSchema,
}).strict();

function publicApiOrigin(): URL {
  const configuredOrigin = process.env.NEXT_PUBLIC_API_URL;
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const localOrigin = process.env.NODE_ENV === "development"
    ? `http://localhost:${process.env.PORT ?? "3000"}`
    : undefined;
  const origin = configuredOrigin || vercelOrigin || localOrigin;
  if (!origin) throw new Error("NEXT_PUBLIC_API_URL is required for public recipe rendering.");
  return new URL(origin);
}

export function sharedRecipeImageUrl(path: string | null): string | undefined {
  return path ? new URL(path, publicApiOrigin()).toString() : undefined;
}

export async function fetchSharedRecipe(token: string): Promise<SharedRecipePublicDto | null> {
  const url = new URL(`/api/public/recipes/${encodeURIComponent(token)}`, publicApiOrigin());
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Public recipe request failed with status ${response.status}.`);
  return publicRecipeResponseSchema.parse(await response.json()).data;
}
