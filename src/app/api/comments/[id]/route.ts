import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { comments } from "@/lib/db/schema";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const commentId = Number(id);
  const db = getDb();
  const rows = await db.select({ autorUserId: comments.autorUserId }).from(comments).where(eq(comments.id, commentId)).limit(1);
  const c = rows[0];
  if (!c) return Response.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
  if (c.autorUserId !== auth.id && auth.rolle !== "admin") {
    return Response.json({ error: "Nicht erlaubt" }, { status: 403 });
  }
  await db.delete(comments).where(eq(comments.id, commentId));
  return Response.json({ ok: true });
}
