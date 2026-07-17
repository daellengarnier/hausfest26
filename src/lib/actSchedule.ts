import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { scheduleEntries, ressorts } from "@/lib/db/schema";

const SPAN = 960; // 16:00 → 08:00 (Folgetag) in Minuten
const validTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= SPAN;

// Hält den Line-up-Eintrag (Programm-Board) eines Acts synchron.
// floor === undefined  → nur den Titel des bestehenden Eintrags nachziehen.
// floor gesetzt + gültige Zeiten → Eintrag anlegen/aktualisieren.
// floor leer / ungültig → Act aus dem Line-up nehmen (Eintrag löschen).
export async function syncActSchedule(
  actId: number,
  name: string,
  floor: string | undefined,
  startMin: number | undefined,
  endMin: number | undefined,
): Promise<void> {
  const db = getDb();
  const existing = await db.select({ id: scheduleEntries.id }).from(scheduleEntries).where(eq(scheduleEntries.actId, actId)).limit(1);

  if (floor === undefined) {
    if (existing[0]) await db.update(scheduleEntries).set({ titel: name || "Act" }).where(eq(scheduleEntries.id, existing[0].id));
    return;
  }

  const f = String(floor).trim();
  const hasSlot = !!f && validTime(startMin) && validTime(endMin) && (endMin as number) > (startMin as number);

  if (hasSlot) {
    const zp = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.hatZeitplan, true)).limit(1);
    if (!zp[0]) return; // Kein Programm-Ressort → nichts zu tun.
    if (existing[0]) {
      await db.update(scheduleEntries).set({ floor: f, titel: name || "Act", startMin: startMin!, endMin: endMin! }).where(eq(scheduleEntries.id, existing[0].id));
    } else {
      await db.insert(scheduleEntries).values({ ressortId: zp[0].id, board: "programm", actId, floor: f, titel: name || "Act", startMin: startMin!, endMin: endMin! });
    }
  } else if (existing[0]) {
    await db.delete(scheduleEntries).where(eq(scheduleEntries.id, existing[0].id));
  }
}
