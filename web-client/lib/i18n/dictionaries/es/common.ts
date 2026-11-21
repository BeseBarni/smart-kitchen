import type { WidenStrings } from "../../types";
import type { common as english } from "../en/common";

export const common = {
  appName: "PrepPilot",
  installName: "PrepPilot asistente de cocina",
  appDescription: "Tu asistente para preparar comidas y organizar tu cocina.",
  close: "Cerrar",
  retry: "Intentar de nuevo",
  loading: "Cargando...",
  cancel: "Cancelar",
  save: "Guardar",
  delete: "Eliminar",
  error: "Algo ha salido mal. Inténtalo de nuevo.",
  notFound: "No se ha encontrado esta página.",
  backToChat: "Volver al chat",
} satisfies WidenStrings<typeof english>;
