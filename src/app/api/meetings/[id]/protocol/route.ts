import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetings, protocols } from "@/lib/db/schema";

// Protokoll speichern (Autosave).
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const meetingId = Number(id);
  const db = getDb();
  const m = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (!m[0]) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const inhalt = String(body?.inhalt ?? "");
  await db
    .insert(protocols)
    .values({ meetingId, inhalt, aktualisiertVon: auth.id, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: protocols.meetingId,
      set: { inhalt, aktualisiertVon: auth.id, updatedAt: new Date() },
    });
  const rows = await db.select().from(protocols).where(eq(protocols.meetingId, meetingId)).limit(1);
  return Response.json({ protocol: rows[0] });
}
