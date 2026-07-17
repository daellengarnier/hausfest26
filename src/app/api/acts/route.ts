import { eq, and, asc, inArray } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { acts, actFiles, attachments, scheduleEntries, scheduleFloors, users, ressorts } from "@/lib/db/schema";
import { syncActExpense } from "@/lib/actExpense";
import { syncActSchedule } from "@/lib/actSchedule";

const TYPEN = ["band", "dj", "andere"];
const normTyp = (v: unknown) => (TYPEN.includes(String(v)) ? String(v) : "band");
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

// Programm-Floors (für Auswahl & Gruppierung in Acts).
async function programmFloors() {
  const db = getDb();
  const zp = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.hatZeitplan, true)).limit(1);
  if (!zp[0]) return [];
  return db
    .select({ name: scheduleFloors.name, farbe: scheduleFloors.farbe })
    .from(scheduleFloors)
    .where(and(eq(scheduleFloors.ressortId, zp[0].id), eq(scheduleFloors.board, "programm")))
    .orderBy(asc(scheduleFloors.reihenfolge), asc(scheduleFloors.id));
}

// Alle Acts eines Ressorts inkl. Dateien (nach Rubrik) und verknüpftem Line-up-Slot.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const ressortId = Number(new URL(request.url).searchParams.get("ressortId"));
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });
  const db = getDb();

  const rows = await db
    .select({
      id: acts.id,
      name: acts.name,
      typ: acts.typ,
      kostenCents: acts.kostenCents,
      uebernachtung: acts.uebernachtung,
      anzahlPersonen: acts.anzahlPersonen,
      promotext: acts.promotext,
      notiz: acts.notiz,
      getIn: acts.getIn,
      soundcheck: acts.soundcheck,
      createdAt: acts.createdAt,
      createdByName: users.name,
    })
    .from(acts)
    .leftJoin(users, eq(users.id, acts.createdBy))
    .where(eq(acts.ressortId, ressortId))
    .orderBy(asc(acts.name), asc(acts.id));

  const ids = rows.map((r) => r.id);
  const filesByAct = new Map<number, { id: number; attachmentId: number; filename: string; mime: string; size: number; rubrik: string }[]>();
  const slotByAct = new Map<number, { entryId: number; floor: string; startMin: number; endMin: number }>();
  if (ids.length > 0) {
    const fileRows = await db
      .select({
        id: actFiles.id,
        actId: actFiles.actId,
        rubrik: actFiles.rubrik,
        attachmentId: attachments.id,
        filename: attachments.filename,
        mime: attachments.mime,
        size: attachments.size,
      })
      .from(actFiles)
      .innerJoin(attachments, eq(attachments.id, actFiles.attachmentId))
      .where(inArray(actFiles.actId, ids));
    for (const f of fileRows) {
      const arr = filesByAct.get(f.actId) ?? [];
      arr.push({ id: f.id, attachmentId: f.attachmentId, filename: f.filename, mime: f.mime, size: f.size, rubrik: f.rubrik });
      filesByAct.set(f.actId, arr);
    }
    const slots = await db
      .select({ entryId: scheduleEntries.id, actId: scheduleEntries.actId, floor: scheduleEntries.floor, startMin: scheduleEntries.startMin, endMin: scheduleEntries.endMin })
      .from(scheduleEntries)
      .where(inArray(scheduleEntries.actId, ids));
    for (const s of slots) if (s.actId != null) slotByAct.set(s.actId, { entryId: s.entryId, floor: s.floor, startMin: s.startMin, endMin: s.endMin });
  }

  const list = rows.map((r) => ({ ...r, files: filesByAct.get(r.id) ?? [], slot: slotByAct.get(r.id) ?? null }));
  return Response.json({ acts: list, floors: await programmFloors() });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = Number(body?.ressortId);
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });
  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const name = String(body?.name ?? "").trim();
  const kostenCents = toCents(body?.kostenCents);
  const inserted = await db
    .insert(acts)
    .values({
      ressortId,
      name,
      typ: normTyp(body?.typ),
      kostenCents,
      uebernachtung: !!body?.uebernachtung,
      anzahlPersonen: toCount(body?.anzahlPersonen),
      promotext: String(body?.promotext ?? "").trim(),
      notiz: String(body?.notiz ?? "").trim(),
      getIn: String(body?.getIn ?? "").trim(),
      soundcheck: String(body?.soundcheck ?? "").trim(),
      createdBy: auth.id,
    })
    .returning({ id: acts.id });
  await syncActExpense(inserted[0].id, name, kostenCents);
  // Showtime (Floor + Von/Bis) → Line-up-Eintrag.
  await syncActSchedule(inserted[0].id, name, body?.floor !== undefined ? String(body.floor) : undefined, toMin(body?.startMin), toMin(body?.endMin));
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
