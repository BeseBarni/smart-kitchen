import type { ShoppingItemInput, ShoppingSuggestion } from "./shopping.schema";

type Stock = { name: string; unit: string; quantity: number };

function normalized(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

const units: Record<string, { dimension: string; factor: number }> = {
  g: { dimension: "mass", factor: 1 }, gram: { dimension: "mass", factor: 1 }, grams: { dimension: "mass", factor: 1 },
  kg: { dimension: "mass", factor: 1000 }, kilogram: { dimension: "mass", factor: 1000 },
  ml: { dimension: "volume", factor: 1 }, l: { dimension: "volume", factor: 1000 },
};

function conversion(from: string, to: string): number | undefined {
  const a = normalized(from);
  const b = normalized(to);
  if (a === b) return 1;
  const source = units[a];
  const target = units[b];
  return source && target && source.dimension === target.dimension ? source.factor / target.factor : undefined;
}

function similar(a: string, b: string): boolean {
  return a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));
}

export function suggestShoppingItems(items: ShoppingItemInput[], stock: Stock[]): ShoppingSuggestion[] {
  const remaining = stock.map((entry) => ({ ...entry }));
  return items.map((item) => {
    let needed = item.quantity;
    const name = normalized(item.name);
    const uncertainMatches: string[] = [];
    for (const available of remaining) {
      const other = normalized(available.name);
      const ratio = conversion(available.unit, item.unit);
      if (other === name && ratio !== undefined) {
        const used = Math.min(needed, available.quantity * ratio);
        needed -= used;
        available.quantity -= used / ratio;
      } else if (available.quantity > 0 && (other === name || similar(name, other))) {
        uncertainMatches.push(`${available.name} (${available.quantity} ${available.unit})`);
      }
    }
    return {
      ...item,
      missingQuantity: Math.max(0, Math.ceil((needed - 1e-9) * 1000) / 1000),
      uncertainMatches,
    };
  });
}
