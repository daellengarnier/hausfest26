// Ausgaben-Kategorien (fix) + Geld-Helfer. Von Client & Server nutzbar.
export const EXPENSE_CATEGORIES = [
  "Deko",
  "Essen",
  "Getränke",
  "Material/Miete",
  "Technik",
  "Promo",
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

// Farbton je Kategorie (naturnahe Palette).
export const CATEGORY_COLOR: Record<string, string> = {
  Deko: "#4b7f52",
  Essen: "#c2703d",
  "Getränke": "#0e8ba3",
  "Material/Miete": "#7a8f3f",
  Technik: "#6b7280",
  Promo: "#b08900",
  Sonstiges: "#8a8172",
};
