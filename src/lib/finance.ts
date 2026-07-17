// Kostenstellen als gemeinsame Achse für Budget (Plan) & Ausgaben (Ist).
export const EXPENSE_CATEGORIES = [
  "Essen",
  "Getränke",
  "Gagen",
  "Deko",
  "Materialmiete",
  "Sonstiges",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function normalizeCategory(v: unknown): ExpenseCategory {
  const s = String(v ?? "");
  return (EXPENSE_CATEGORIES as readonly string[]).includes(s) ? (s as ExpenseCategory) : "Sonstiges";
}

// Rappen → "1'234.50"
export function formatChf(cents: number): string {
  const v = (cents / 100).toFixed(2);
  const [whole, frac] = v.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${frac}`;
}

// Farbton je Kostenstelle (naturnahe Palette).
export const CATEGORY_COLOR: Record<string, string> = {
  Essen: "#c2703d",
  "Getränke": "#0e8ba3",
  Gagen: "#8a3ea8",
  Deko: "#4b7f52",
  Materialmiete: "#7a8f3f",
  Sonstiges: "#8a8172",
};
