import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleMarkers, ressorts } from "@/lib/db/schema";
import type { BoardKind } from "@/lib/db/schema";

const SPAN = 960;
const boardOf = (v: string | null | undefined): BoardKind => (v === "bars" ? "bars" : "programm");
const validTime = (v: number) => Number.isFinite(v) && v >= 0 && v <= SPAN;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const body = await request.json().catch(() => ({}));
  const board = boardOf(body?.board);
  const titel = String(body?.titel ?? "").trim();
  const startMin = Number(body?.startMin);
  const endMin = Number(body?.endMin);
  if (!titel) return Response.json({ error: "Bezeichnung erforderlich" }, { status: 400 });
  if (!validTime(startMin) || !validTime(endMin) || endMin <= startMin) {
    return Response.json({ error: "Ungültige Zeiten (Ende muss nach Start liegen)" }, { status: 400 });
  }
  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const farbe = String(body?.farbe ?? "").trim() || "#f59e0b";
  const inserted = await db
    .insert(scheduleMarkers)
    .values({ ressortId, board, titel, startMin, endMin, farbe })
    .returning();
  return Response.json({ marker: inserted[0] }, { status: 201 });
}
