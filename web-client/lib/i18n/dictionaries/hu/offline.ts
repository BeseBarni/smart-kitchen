import type { WidenStrings } from "../../types";
import type { offline as english } from "../en/offline";
export const offline = {
  title: "Nincs kapcsolat - PrepPilot",
  heading: "Nincs internetkapcsolat",
  description: "Csatlakozz újra a beszélgetések, receptek és a készlet eléréséhez.",
  retry: "Próbáld újra",
  storageError: "Nem sikerült betölteni a mentett nyelvet.",
} satisfies WidenStrings<typeof english>;
