import { eq } from "drizzle-orm";
import { requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const userId = Number(id);
  const body = await request.json().catch(() => ({}));
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing[0]) return Response.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  const patch: Partial<typeof users.$inferInsert> = {};
  if (body?.name !== undefined) patch.name = String(body.name).trim();
  if (body?.rolle !== undefined) patch.rolle = body.rolle === "admin" ? "admin" : "mitglied";
  if (body?.active !== undefined) patch.active = !!body.active;
  if (Object.keys(patch).length > 0) await db.update(users).set(patch).where(eq(users.id, userId));
  return Response.json({ ok: true });
}
