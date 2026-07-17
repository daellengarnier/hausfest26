import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { users, attachments } from "@/lib/db/schema";

// Profilbild einer Person ausliefern (oder 404, falls keins gesetzt ist).
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const db = getDb();
  const u = await db.select({ aid: users.avatarAttachmentId }).from(users).where(eq(users.id, Number(id))).limit(1);
  if (!u[0]?.aid) return new Response(null, { status: 404 });
  const rows = await db.select().from(attachments).where(eq(attachments.id, u[0].aid)).limit(1);
  const a = rows[0];
  if (!a) return new Response(null, { status: 404 });
  const buf = Buffer.from(a.dataB64, "base64");
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": a.mime, "Cache-Control": "private, max-age=300" },
  });
}
