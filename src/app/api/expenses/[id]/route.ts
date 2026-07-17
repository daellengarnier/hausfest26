import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { normalizeCategory } from "@/lib/finance";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select().from(expenses).where(eq(expenses.id, Number(id))).limit(1);
  const e = rows[0];
  if (!e) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  if (e.userId !== auth.id && auth.rolle !== "admin") return Response.json({ error: "Nicht erlaubt" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof expenses.$inferInsert> = {};
  if (body?.betragCents !== undefined) {
    const c = Math.round(Number(body.betragCents));
    if (!Number.isFinite(c) || c <= 0) return Response.json({ error: "Ungültiger Betrag" }, { status: 400 });
    patch.betragCents = c;
  }
  if (body?.kategorie !== undefined) patch.kategorie = normalizeCategory(body.kategorie);
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung).trim();
  if (body?.datum !== undefined) patch.datum = body.datum || null;
  if (body?.belegId !== undefined) patch.belegId = body.belegId ? Number(body.belegId) : null;
  if (Object.keys(patch).length > 0) await db.update(expenses).set(patch).where(eq(expenses.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select({ userId: expenses.userId }).from(expenses).where(eq(expenses.id, Number(id))).limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  if (rows[0].userId !== auth.id && auth.rolle !== "admin") return Response.json({ error: "Nicht erlaubt" }, { status: 403 });
  await db.delete(expenses).where(eq(expenses.id, Number(id)));
  return Response.json({ ok: true });
}
