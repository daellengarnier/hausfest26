import { eq, and, asc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleEntries, scheduleFloors, scheduleMarkers, ressorts } from "@/lib/db/schema";
import type { BoardKind } from "@/lib/db/schema";

const SPAN = 960; // 16:00 → 08:00 (Folgetag) in Minuten

function boardOf(v: string | null): BoardKind {
  return v === "bars" ? "bars" : "programm";
}
function validTime(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= SPAN;
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
  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(and(eq(scheduleEntries.ressortId, ressortId), eq(scheduleEntries.board, board)))
    .orderBy(asc(scheduleEntries.startMin), asc(scheduleEntries.id));
  const markers = await db
    .select()
    .from(scheduleMarkers)
    .where(and(eq(scheduleMarkers.ressortId, ressortId), eq(scheduleMarkers.board, board)))
    .orderBy(asc(scheduleMarkers.startMin), asc(scheduleMarkers.id));
  return Response.json({ floors, entries, markers });
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
    .values({ ressortId, board, floor, titel, startMin, endMin })
    .returning();
  return Response.json({ entry: inserted[0] }, { status: 201 });
}
