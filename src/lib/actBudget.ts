import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { budgetItems, ressorts } from "@/lib/db/schema";

// Hält den Finanzen-Posten „Gagen" mit der Gage eines Acts synchron.
// Gage gesetzt → Budgetposten (Bereich „Gagen") anlegen/aktualisieren.
// Gage entfernt → zugehörigen Budgetposten löschen.
export async function syncActBudget(actId: number, name: string, kostenCents: number | null | undefined) {
  const db = getDb();
  const fin = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.hatFinanzen, true)).limit(1);
  if (!fin[0]) return; // Kein Finanzen-Ressort → nichts zu tun.
  const finanzRessortId = fin[0].id;
  const titel = `Gage: ${name || "Act"}`.trim();

  if (kostenCents && kostenCents > 0) {
    const existing = await db.select({ id: budgetItems.id }).from(budgetItems).where(eq(budgetItems.actId, actId)).limit(1);
    if (existing[0]) {
      await db
        .update(budgetItems)
        .set({ betragCents: kostenCents, titel, kategorie: "Gagen", ressortId: finanzRessortId })
        .where(eq(budgetItems.id, existing[0].id));
    } else {
      await db.insert(budgetItems).values({
        ressortId: finanzRessortId,
        actId,
        kategorie: "Gagen",
        titel,
        betragCents: kostenCents,
        beschreibung: "Automatisch aus Act (Acts-Ressort)",
      });
    }
  } else {
    await db.delete(budgetItems).where(and(eq(budgetItems.actId, actId)));
  }
}
