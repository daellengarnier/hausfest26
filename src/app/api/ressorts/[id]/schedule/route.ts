import { eq, and, asc, inArray } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleEntries, scheduleFloors, scheduleMarkers, scheduleEntryFiles, attachments, ressorts, acts } from "@/lib/db/schema";
import type { BoardKind } from "@/lib/db/schema";

const SPAN = 960; // 16:00 → 08:00 (Folgetag) in Minuten

function boardOf(v: string | null): BoardKind {
  return v === "bars" ? "bars" : "programm";
}
function validTime(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= SPAN;
}

async function linkFiles(entryId: number, fileIds: number[]) {
  const db = getDb();
  await db.delete(scheduleEntryFiles).where(eq(scheduleEntryFiles.entryId, entryId));
  const ids = [...new Set(fileIds.map(Number).filter((n) => Number.isFinite(n)))];
  if (ids.length > 0) {
    await db.insert(scheduleEntryFiles).values(ids.map((attachmentId) => ({ entryId, attachmentId }))).onConflictDoNothing();
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const board = boardOf(new URL(request.url).searchParams.get("board"));
  const db = getDb();

  const floors = await db
    .select()
    .from(scheduleFloors)
    .where(and(eq(scheduleFloors.ressortId, ressortId), eq(scheduleFloors.board, board)))
    .orderBy(asc(scheduleFloors.reihenfolge), asc(scheduleFloors.id));
  const rawEntries = await db
    .select()
    .from(scheduleEntries)
    .where(and(eq(scheduleEntries.ressortId, ressortId), eq(scheduleEntries.board, board)))
    .orderBy(asc(scheduleEntries.startMin), asc(scheduleEntries.id));

  // Dateien je Eintrag laden.
  const filesByEntry = new Map<number, { id: number; filename: string; mime: string; size: number }[]>();
  const entryIds = rawEntries.map((e) => e.id);
  if (entryIds.length > 0) {
    const fileRows = await db
      .select({
        entryId: scheduleEntryFiles.entryId,
        id: attachments.id,
        filename: attachments.filename,
        mime: attachments.mime,
        size: attachments.size,
      })
      .from(scheduleEntryFiles)
      .innerJoin(attachments, eq(attachments.id, scheduleEntryFiles.attachmentId))
      .where(inArray(scheduleEntryFiles.entryId, entryIds));
    for (const r of fileRows) {
      const arr = filesByEntry.get(r.entryId) ?? [];
      arr.push({ id: r.id, filename: r.filename, mime: r.mime, size: r.size });
      filesByEntry.set(r.entryId, arr);
    }
  }
  const entries = rawEntries.map((e) => ({ ...e, files: filesByEntry.get(e.id) ?? [] }));

  const markers = await db
    .select()
    .from(scheduleMarkers)
    .where(and(eq(scheduleMarkers.ressortId, ressortId), eq(scheduleMarkers.board, board)))
    .orderBy(asc(scheduleMarkers.startMin), asc(scheduleMarkers.id));
  return Response.json({ floors, entries, markers });
}

function extras(body: Record<string, unknown>) {
  const out: { notiz?: string; anzahlLeute?: number | null; gageCents?: number | null } = {};
  if (body?.notiz !== undefined) out.notiz = String(body.notiz ?? "");
  if (body?.anzahlLeute !== undefined) {
    const n = Number(body.anzahlLeute);
    out.anzahlLeute = Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }
  if (body?.gageCents !== undefined) {
    const g = Number(body.gageCents);
    out.gageCents = Number.isFinite(g) && g > 0 ? Math.round(g) : null;
  }
  return out;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const body = await request.json().catch(() => ({}));
  const board = boardOf(body?.board ?? null);
  const floor = String(body?.floor ?? "").trim();
  const titel = String(body?.titel ?? "").trim();
  const startMin = Number(body?.startMin);
  const endMin = Number(body?.endMin);
  if (!validTime(startMin) || !validTime(endMin) || endMin <= startMin) {
    return Response.json({ error: "Ungültige Zeiten (Ende muss nach Start liegen)" }, { status: 400 });
  }
  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const inserted = await db
    .insert(scheduleEntries)
    .values({ ressortId, board, floor, titel, startMin, endMin, ...extras(body) })
    .returning();
  if (Array.isArray(body?.fileIds)) await linkFiles(inserted[0].id, body.fileIds);

  // Line-up-Eintrag (Programm) automatisch mit einem Act-„Ordner" verknüpfen,
  // damit Rider/Kosten/Übernachtung im Acts-Ressort gepflegt werden können.
  if (board === "programm") {
    const actsRessort = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.hatActs, true)).limit(1);
    if (actsRessort[0]) {
      const newAct = await db
        .insert(acts)
        .values({ ressortId: actsRessort[0].id, name: titel || "Act", createdBy: auth.id })
        .returning({ id: acts.id });
      await db.update(scheduleEntries).set({ actId: newAct[0].id }).where(eq(scheduleEntries.id, inserted[0].id));
      inserted[0].actId = newAct[0].id;
    }
  }
  return Response.json({ entry: inserted[0] }, { status: 201 });
}
