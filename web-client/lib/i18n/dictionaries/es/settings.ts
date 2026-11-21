import type { WidenStrings } from "../../types";
import type { settings as english } from "../en/settings";

export const settings = {
  title: "Idioma",
  description: "Elige el idioma de la aplicación.",
  selector: "Idioma de la aplicación",
  changed: "Idioma actualizado.",
  storageError: "El idioma se ha cambiado para esta sesión, pero no se ha podido guardar.",
} satisfies WidenStrings<typeof english>;
