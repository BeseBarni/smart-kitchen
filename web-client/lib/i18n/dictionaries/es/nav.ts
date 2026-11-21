import type { WidenStrings } from "../../types";
import type { nav as english } from "../en/nav";

export const nav = {
  main: "Navegación principal",
  chat: "Chat",
  inventory: "Inventario",
  recipes: "Recetas",
  tracker: "Calorías",
  account: "Cuenta",
  assistant: "Asistente de cocina",
} satisfies WidenStrings<typeof english>;
