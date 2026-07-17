import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { shoppingItems } from "@/lib/db/schema";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select({ id: shoppingItems.id }).from(shoppingItems).where(eq(shoppingItems.id, Number(id))).limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof shoppingItems.$inferInsert> = {};
  if (body?.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body?.menge !== undefined) patch.menge = String(body.menge ?? "").trim();
  if (body?.erledigt !== undefined) patch.erledigt = !!body.erledigt;
  if (Object.keys(patch).length > 0) await db.update(shoppingItems).set(patch).where(eq(shoppingItems.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select({ id: shoppingItems.id }).from(shoppingItems).where(eq(shoppingItems.id, Number(id))).limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  await db.delete(shoppingItems).where(eq(shoppingItems.id, Number(id)));
  return Response.json({ ok: true });
}
