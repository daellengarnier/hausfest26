import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { budgetItems } from "@/lib/db/schema";
import { normalizeCategory } from "@/lib/finance";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select().from(budgetItems).where(eq(budgetItems.id, Number(id))).limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof budgetItems.$inferInsert> = {};
  if (body?.betragCents !== undefined) {
    const c = Math.round(Number(body.betragCents));
    if (!Number.isFinite(c) || c <= 0) return Response.json({ error: "Ungültiger Betrag" }, { status: 400 });
    patch.betragCents = c;
  }
  if (body?.kategorie !== undefined) patch.kategorie = normalizeCategory(body.kategorie);
  if (body?.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung).trim();
  if (Object.keys(patch).length > 0) await db.update(budgetItems).set(patch).where(eq(budgetItems.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select({ id: budgetItems.id }).from(budgetItems).where(eq(budgetItems.id, Number(id))).limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  await db.delete(budgetItems).where(eq(budgetItems.id, Number(id)));
  return Response.json({ ok: true });
}
