import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { subRessorts } from "@/lib/db/schema";

export async function PATCH(request: Request, ctx: { params: Promise<{ subId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { subId } = await ctx.params;
  const id = Number(subId);
  const db = getDb();
  const existing = await db.select({ id: subRessorts.id }).from(subRessorts).where(eq(subRessorts.id, id)).limit(1);
  if (!existing[0]) return Response.json({ error: "Sub-Ressort nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof subRessorts.$inferInsert> = {};
  if (body?.name !== undefined) patch.name = String(body.name).trim();
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (Object.keys(patch).length > 0) await db.update(subRessorts).set(patch).where(eq(subRessorts.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ subId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { subId } = await ctx.params;
  await getDb().delete(subRessorts).where(eq(subRessorts.id, Number(subId)));
  return Response.json({ ok: true });
}
