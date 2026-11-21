import type { WidenStrings } from "../../types";
import type { errors as english } from "../en/errors";

export const errors = {
  ITEM_NOT_FOUND: "A keresett elem nem található.",
  INSUFFICIENT_QUANTITY: "Nincs elegendő készlet.",
  VALIDATION_ERROR: "Ellenőrizd a megadott adatokat, és próbáld újra.",
  UNAUTHORIZED: "Jelentkezz be újra.",
  CONFLICT: "A művelet ütközik egy friss módosítással. Próbáld újra.",
  INTERNAL_ERROR: "A kérés sikertelen volt. Próbáld újra.",
  ACCOUNT_NOT_FOUND: "A fiókod nem található.",
} satisfies WidenStrings<typeof english>;
