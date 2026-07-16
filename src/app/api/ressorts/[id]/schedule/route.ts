import { eq, asc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleEntries, scheduleFloors, ressorts } from "@/lib/db/schema";

const SPAN = 960; // 16:00 → 08:00 (Folgetag) in Minuten

function validTime(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= SPAN;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const db = getDb();
  const floors = await db
    .select()
    .from(scheduleFloors)
    .where(eq(scheduleFloors.ressortId, ressortId))
    .orderBy(asc(scheduleFloors.reihenfolge), asc(scheduleFloors.id));
  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.ressortId, ressortId))
    .orderBy(asc(scheduleEntries.startMin), asc(scheduleEntries.id));
  return Response.json({ floors, entries });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const body = await request.json().catch(() => ({}));
  const floor = String(body?.floor ?? "").trim();
  const titel = String(body?.titel ?? "").trim();
  const startMin = Number(body?.startMin);
  const endMin = Number(body?.endMin);
  if (!titel) return Response.json({ error: "Act/Name erforderlich" }, { status: 400 });
  if (!validTime(startMin) || !validTime(endMin) || endMin <= startMin) {
    return Response.json({ error: "Ungültige Zeiten (Ende muss nach Start liegen)" }, { status: 400 });
  }
  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const inserted = await db
    .insert(scheduleEntries)
    .values({ ressortId, floor, titel, startMin, endMin })
    .returning();
  return Response.json({ entry: inserted[0] }, { status: 201 });
}
