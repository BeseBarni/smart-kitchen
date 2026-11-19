import { z } from "zod";
import { isValidDate } from "./inventory-formatters";

export const inventoryFormSchema = z.object({
  name: z.string().trim().min(1, "Enter an item name.").max(100),
  storage: z.enum(["fridge", "freezer"]),
  portions: z.number().int().safe().min(1, "Enter at least one portion."),
  bestBefore: z.string().refine(isValidDate, "Enter a valid date."),
  container: z.enum(["glass", "bag", "box"]),
  location: z.string().trim().max(100, "Use at most 100 characters."),
});
