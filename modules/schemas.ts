import { z } from "zod";

export const schemaCatalog = {
  inventory: z.object({}),
  recipes: z.object({}),
  chat: z.object({}),
} as const;
