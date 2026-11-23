import { headers } from "next/headers";
import {
  sharedRecipePublicDtoSchema,
  type SharedRecipePublicDto,
} from "@app/modules/schemas";
import { z } from "zod";

export function resolvePublicApiOrigin(
  requestHeaders: Pick<Headers, "get">,
  isDevelopment: boolean,
): URL {
  const host = (
    requestHeaders.get("x-forwarded-host")
    || requestHeaders.get("host")
  )?.split(",")[0]?.trim();
  if (!host) throw new Error("Unable to resolve the public recipe API host.");

  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || (isDevelopment ? "http" : "https");
  if (protocol !== "http" && protocol !== "https") {
    throw new Error("Unable to resolve the public recipe API protocol.");
  }
  return new URL(`${protocol}://${host}`);
}

export async function getPublicApiOrigin(): Promise<URL> {
  return resolvePublicApiOrigin(await headers(), process.env.NODE_ENV === "development");
}

export function assertPublicApiJson(response: Response): void {
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new Error(
      `Public recipe API returned a non-JSON response (status ${response.status}, content-type ${contentType ?? "missing"}).`,
    );
  }
}

const publicRecipeResponseSchema = z.object({
  data: sharedRecipePublicDtoSchema,
}).strict();

export function sharedRecipeImageUrl(path: string | null, origin: URL): string | undefined {
  return path ? new URL(path, origin).toString() : undefined;
}

export async function fetchSharedRecipe(token: string, origin: URL): Promise<SharedRecipePublicDto | null> {
  const url = new URL(`/api/public/recipes/${encodeURIComponent(token)}`, origin);
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Public recipe request failed with status ${response.status}.`);
  assertPublicApiJson(response);
  return publicRecipeResponseSchema.parse(await response.json()).data;
}
