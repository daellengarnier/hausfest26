import { eq, asc, max } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleFloors, ressorts } from "@/lib/db/schema";

// Farbpalette für neu angelegte Orte (nächste freie Farbe wählen).
const PALETTE = ["#6366f1", "#06b6d4", "#f43f5e", "#22c55e", "#f97316", "#8b5cf6", "#eab308", "#ec4899", "#14b8a6", "#ef4444"];

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "Name des Orts erforderlich" }, { status: 400 });

  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const existing = await db
    .select({ id: scheduleFloors.id, farbe: scheduleFloors.farbe })
    .from(scheduleFloors)
    .where(eq(scheduleFloors.ressortId, ressortId))
    .orderBy(asc(scheduleFloors.reihenfolge));
  const used = new Set(existing.map((f) => f.farbe));
  const farbe = String(body?.farbe ?? "").trim() || PALETTE.find((c) => !used.has(c)) || PALETTE[existing.length % PALETTE.length];
  const maxOrd = (await db.select({ m: max(scheduleFloors.reihenfolge) }).from(scheduleFloors).where(eq(scheduleFloors.ressortId, ressortId)))[0].m ?? 0;

  try {
    const inserted = await db
      .insert(scheduleFloors)
      .values({ ressortId, name, farbe, reihenfolge: maxOrd + 1 })
      .returning();
    return Response.json({ floor: inserted[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "Diesen Ort gibt es bereits" }, { status: 409 });
  }
}
