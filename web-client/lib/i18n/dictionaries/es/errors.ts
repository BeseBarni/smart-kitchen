import type { WidenStrings } from "../../types";
import type { errors as english } from "../en/errors";

export const errors = {
  ITEM_NOT_FOUND: "No se ha encontrado el elemento solicitado.",
  INSUFFICIENT_QUANTITY: "No hay suficiente cantidad disponible.",
  VALIDATION_ERROR: "Comprueba los datos e inténtalo de nuevo.",
  UNAUTHORIZED: "Vuelve a iniciar sesión.",
  CONFLICT: "Esta acción entra en conflicto con un cambio reciente. Inténtalo de nuevo.",
  INTERNAL_ERROR: "La solicitud ha fallado. Inténtalo de nuevo.",
  ACCOUNT_NOT_FOUND: "No se ha encontrado tu cuenta.",
} satisfies WidenStrings<typeof english>;
