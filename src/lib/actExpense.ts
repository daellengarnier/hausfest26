import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { expenses, ressorts } from "@/lib/db/schema";

// Hält die Ausgabe (Ist) „Gage" eines Acts synchron.
// Gage gesetzt → Ausgabe (Kostenstelle „Gagen") anlegen/aktualisieren.
// Gage entfernt → zugehörige Ausgabe löschen.
export async function syncActExpense(actId: number, name: string, kostenCents: number | null | undefined) {
  const db = getDb();
  const fin = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.hatFinanzen, true)).limit(1);
  if (!fin[0]) return; // Kein Finanzen-Ressort → nichts zu tun.
  const finanzRessortId = fin[0].id;
  const beschreibung = `Gage: ${name || "Act"}`.trim();

  if (kostenCents && kostenCents > 0) {
    const existing = await db.select({ id: expenses.id }).from(expenses).where(eq(expenses.actId, actId)).limit(1);
    if (existing[0]) {
      await db
        .update(expenses)
        .set({ betragCents: kostenCents, beschreibung, kategorie: "Gagen", ressortId: finanzRessortId })
        .where(eq(expenses.id, existing[0].id));
    } else {
      await db.insert(expenses).values({
        ressortId: finanzRessortId,
        userId: null,
        betragCents: kostenCents,
        waehrung: "CHF",
        kategorie: "Gagen",
        beschreibung,
        actId,
      });
    }
  } else {
    await db.delete(expenses).where(eq(expenses.actId, actId));
  }
}
