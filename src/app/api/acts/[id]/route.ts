import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { acts, actFiles, scheduleEntries } from "@/lib/db/schema";
import { syncActExpense } from "@/lib/actExpense";
import { syncActSchedule } from "@/lib/actSchedule";

const TYPEN = ["band", "dj", "andere"];
const RUBRIKEN = ["techrider", "hospitality", "sonstiges"];
const toCents = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const toCount = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const toMin = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 960 ? Math.round(n) : undefined;
};

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const actId = Number(id);
  const db = getDb();
  const rows = await db.select().from(acts).where(eq(acts.id, actId)).limit(1);
  const act = rows[0];
  if (!act) return Response.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof acts.$inferInsert> = {};
  if (body?.name !== undefined) patch.name = String(body.name).trim();
  if (body?.typ !== undefined) patch.typ = TYPEN.includes(String(body.typ)) ? String(body.typ) : "band";
  if (body?.kostenCents !== undefined) patch.kostenCents = toCents(body.kostenCents);
  if (body?.uebernachtung !== undefined) patch.uebernachtung = !!body.uebernachtung;
  if (body?.anzahlPersonen !== undefined) patch.anzahlPersonen = toCount(body.anzahlPersonen);
  if (body?.promotext !== undefined) patch.promotext = String(body.promotext ?? "").trim();
  if (body?.notiz !== undefined) patch.notiz = String(body.notiz ?? "").trim();
  if (body?.getIn !== undefined) patch.getIn = String(body.getIn ?? "").trim();
  if (body?.soundcheck !== undefined) patch.soundcheck = String(body.soundcheck ?? "").trim();
  if (Object.keys(patch).length > 0) await db.update(acts).set(patch).where(eq(acts.id, actId));

  // Dateien ersetzen, falls mitgeschickt: [{ attachmentId, rubrik }]
  if (Array.isArray(body?.files)) {
    await db.delete(actFiles).where(eq(actFiles.actId, actId));
    const vals = body.files
      .map((f: { attachmentId?: unknown; rubrik?: unknown }) => ({
        actId,
        attachmentId: Number(f?.attachmentId),
        rubrik: RUBRIKEN.includes(String(f?.rubrik)) ? String(f?.rubrik) : "sonstiges",
      }))
      .filter((v: { attachmentId: number }) => Number.isFinite(v.attachmentId));
    if (vals.length > 0) await db.insert(actFiles).values(vals);
  }

  // Finanzen-Ausgabe „Gage" synchron halten.
  const finalName = patch.name ?? act.name;
  const finalKosten = patch.kostenCents !== undefined ? patch.kostenCents : act.kostenCents;
  await syncActExpense(actId, finalName, finalKosten);
  // Showtime (Floor + Von/Bis) → Line-up-Eintrag synchron halten.
  await syncActSchedule(actId, finalName, body?.floor !== undefined ? String(body.floor) : undefined, toMin(body?.startMin), toMin(body?.endMin));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select({ id: acts.id }).from(acts).where(eq(acts.id, Number(id))).limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  // Acts ist die Quelle: verknüpften Line-up-Eintrag ebenfalls entfernen.
  await db.delete(scheduleEntries).where(eq(scheduleEntries.actId, Number(id)));
  // Cascade entfernt act_files & den „Gagen"-Budgetposten.
  await db.delete(acts).where(eq(acts.id, Number(id)));
  return Response.json({ ok: true });
}
