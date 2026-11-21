import type { WidenStrings } from "../../types";
import type { offline as english } from "../en/offline";
export const offline = {
  title: "Sin conexión - PrepPilot",
  heading: "No tienes conexión",
  description: "Vuelve a conectarte para acceder a tus conversaciones, recetas e inventario.",
  retry: "Intentar de nuevo",
  storageError: "No se ha podido cargar el idioma guardado.",
} satisfies WidenStrings<typeof english>;
