import type { WidenStrings } from "../../types";
import type { shopping as english } from "../en/shopping";
export const shopping = {
  title: "Bevásárlólista", description: "A megvásárolni kívánt hozzávalók.", close: "Bevásárlólista bezárása",
  loading: "Bevásárlólista betöltése...", loadError: "Nem sikerült betölteni a bevásárlólistát.", empty: "A bevásárlólistád üres.",
  remove: "{{name}} eltávolítása", removeError: "Nem sikerült eltávolítani az elemet.", added: "Hozzáadtuk a bevásárlólistához.",
  review: "Hozzáadás előtt ellenőrizd a mennyiségeket és a lehetséges egyezéseket.", quantity: "{{name}} mennyisége",
  available: "Már van a készletben", missing: "Javasolt hiányzó mennyiség: {{count}} {{unit}}",
  matches: "Lehetséges egyezések: {{names}}. Kérjük, ellenőrizd.", adding: "Hozzáadás...", addSelected: "Kijelöltek hozzáadása a bevásárlólistához",
  addError: "Nem sikerült hozzáadni az elemeket.", checking: "Készlet ellenőrzése...", checkError: "Nem sikerült ellenőrizni a készletet.",
} satisfies WidenStrings<typeof english>;
