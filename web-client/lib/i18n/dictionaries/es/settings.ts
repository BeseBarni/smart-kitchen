import type { WidenStrings } from "../../types";
import type { settings as english } from "../en/settings";

export const settings = {
  title: "Idioma",
  description: "Elige el idioma de la aplicación.",
  selector: "Idioma de la aplicación",
  changed: "Idioma actualizado.",
  storageError: "El idioma se ha cambiado para esta sesión, pero no se ha podido guardar.",
  avatar: "Foto de perfil", chooseAvatar: "Elegir foto", replaceAvatar: "Cambiar foto",
  removeAvatar: "Eliminar foto", camera: "Hacer foto", uploadingAvatar: "Subiendo",
  avatarUpdated: "Foto de perfil actualizada.", avatarRemoved: "Foto de perfil eliminada.",
} satisfies WidenStrings<typeof english>;
