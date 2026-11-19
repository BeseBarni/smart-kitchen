import type { AppType } from "@app/server";
import { hc } from "hono/client";

const client = hc<AppType>("/");

export async function fetchAccount(): Promise<{ id: string; name: string; email: string }> {
  const response = await client.api.account.$get();
  if (!response.ok) {
    const body = await response.json();
    throw new Error("error" in body ? body.error : "Could not load account.");
  }
  return response.json();
}
