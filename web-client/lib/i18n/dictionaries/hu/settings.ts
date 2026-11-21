import type { WidenStrings } from "../../types";
import type { settings as english } from "../en/settings";

export const settings = {
  title: "Nyelv",
  description: "Válaszd ki az alkalmazás nyelvét.",
  selector: "Az alkalmazás nyelve",
  changed: "A nyelvet módosítottuk.",
  storageError: "A nyelvet erre a munkamenetre beállítottuk, de nem sikerült elmenteni.",
  avatar: "Profilkép", chooseAvatar: "Fotó kiválasztása", replaceAvatar: "Fotó cseréje",
  removeAvatar: "Fotó eltávolítása", camera: "Fotó készítése", uploadingAvatar: "Feltöltés",
  avatarUpdated: "A profilképet frissítettük.", avatarRemoved: "A profilképet eltávolítottuk.",
} satisfies WidenStrings<typeof english>;
