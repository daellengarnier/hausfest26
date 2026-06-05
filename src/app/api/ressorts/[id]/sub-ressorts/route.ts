import { eq, max } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { ressorts, subRessorts } from "@/lib/db/schema";

// Sub-Ressorts dürfen von allen Mitgliedern angelegt werden (Vertrauensmodell).
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "Name erforderlich" }, { status: 400 });

  const db = getDb();
  const ressort = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!ressort[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const maxRow = await db
    .select({ m: max(subRessorts.reihenfolge) })
    .from(subRessorts)
    .where(eq(subRessorts.ressortId, ressortId));
  const inserted = await db
    .insert(subRessorts)
    .values({
      ressortId,
      name,
      beschreibung: String(body?.beschreibung ?? ""),
      reihenfolge: (maxRow[0].m ?? 0) + 1,
    })
    .returning({ id: subRessorts.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
