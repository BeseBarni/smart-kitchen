import type { WidenStrings } from "../../types";
import type { shopping as english } from "../en/shopping";
export const shopping = {
  title: "Lista de la compra", description: "Ingredientes que piensas comprar.", close: "Cerrar lista de la compra",
  loading: "Cargando lista de la compra...", loadError: "No se ha podido cargar la lista de la compra.", empty: "Tu lista de la compra está vacía.",
  remove: "Quitar {{name}}", removeError: "No se ha podido quitar el elemento.", added: "Añadido a la lista de la compra.",
  review: "Revisa las cantidades y las posibles coincidencias antes de añadir.", quantity: "Cantidad de {{name}}",
  available: "Disponible en el inventario", missing: "Cantidad que falta sugerida: {{count}} {{unit}}",
  matches: "Posibles coincidencias: {{names}}. Compruébalas.", adding: "Añadiendo...", addSelected: "Añadir selección a la lista de la compra",
  addError: "No se han podido añadir los elementos.", checking: "Comprobando inventario...", checkError: "No se ha podido comprobar el inventario.",
} satisfies WidenStrings<typeof english>;
