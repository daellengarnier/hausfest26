import { eq, and, asc, max } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleFloors, ressorts } from "@/lib/db/schema";
import type { BoardKind } from "@/lib/db/schema";

const PALETTE = ["#6366f1", "#06b6d4", "#f43f5e", "#22c55e", "#f97316", "#8b5cf6", "#eab308", "#ec4899", "#14b8a6", "#ef4444"];
const boardOf = (v: string | null | undefined): BoardKind => (v === "bars" ? "bars" : "programm");

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const body = await request.json().catch(() => ({}));
  const board = boardOf(body?.board);
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "Name erforderlich" }, { status: 400 });

  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const existing = await db
    .select({ farbe: scheduleFloors.farbe })
    .from(scheduleFloors)
    .where(and(eq(scheduleFloors.ressortId, ressortId), eq(scheduleFloors.board, board)));
  const used = new Set(existing.map((f) => f.farbe));
  const farbe = String(body?.farbe ?? "").trim() || PALETTE.find((c) => !used.has(c)) || PALETTE[existing.length % PALETTE.length];
  const maxOrd =
    (await db
      .select({ m: max(scheduleFloors.reihenfolge) })
      .from(scheduleFloors)
      .where(and(eq(scheduleFloors.ressortId, ressortId), eq(scheduleFloors.board, board))))[0].m ?? 0;

  try {
    const inserted = await db
      .insert(scheduleFloors)
      .values({ ressortId, board, name, farbe, reihenfolge: maxOrd + 1 })
      .returning();
    return Response.json({ floor: inserted[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "Diesen Eintrag gibt es bereits" }, { status: 409 });
  }
}
