import type { WidenStrings } from "../../types";
import type { common as english } from "../en/common";

export const common = {
  appName: "PrepPilot",
  installName: "PrepPilot konyhai asszisztens",
  appDescription: "A társad az ételek előkészítésében és a konyhai készletek kezelésében.",
  close: "Bezárás",
  retry: "Próbáld újra",
  loading: "Betöltés...",
  cancel: "Mégse",
  save: "Mentés",
  delete: "Törlés",
  error: "Valami hiba történt. Próbáld újra.",
  notFound: "Ez az oldal nem található.",
  backToChat: "Vissza a beszélgetéshez",
} satisfies WidenStrings<typeof english>;
