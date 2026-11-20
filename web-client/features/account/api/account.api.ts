import { z } from "zod";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";

const accountSchema = z.object({ id: z.string(), name: z.string(), email: z.email() });

export async function fetchAccount(): Promise<{ id: string; name: string; email: string }> {
  return unwrapApiResponse(await apiClient.api.account.$get(), accountSchema);
}
