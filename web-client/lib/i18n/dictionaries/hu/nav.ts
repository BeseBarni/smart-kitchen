import type { WidenStrings } from "../../types";
import type { nav as english } from "../en/nav";

export const nav = {
  main: "Fő navigáció",
  chat: "Beszélgetés",
  inventory: "Készlet",
  recipes: "Receptek",
  tracker: "Kalóriák",
  account: "Fiók",
  assistant: "Konyhai asszisztens",
} satisfies WidenStrings<typeof english>;
