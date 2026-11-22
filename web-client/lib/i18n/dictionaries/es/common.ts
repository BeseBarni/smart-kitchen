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
  syncing: "Sincronizando...",
  optimisticRollback: "No se ha podido guardar el cambio. Se ha restaurado.",
  unknown: "Desconocido",
  stockImageTab: "Buscar imagen",
  uploadPhotoTab: "Subir foto",
  stockImageSearch: "Buscar imágenes de archivo",
  stockImagePlaceholder: "Busca un plato o ingrediente",
  stockImageEmpty: "No se encontraron imágenes coincidentes.",
  stockImageError: "No se pudo buscar imágenes.",
  stockImageAttribution: "Datos de recetas e imágenes: TheMealDB",
} satisfies WidenStrings<typeof english>;
