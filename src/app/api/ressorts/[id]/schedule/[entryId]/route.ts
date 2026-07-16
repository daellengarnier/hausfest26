import { eq, and } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleEntries } from "@/lib/db/schema";

const SPAN = 960;
const validTime = (v: number) => Number.isFinite(v) && v >= 0 && v <= SPAN;

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string; entryId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id, entryId } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof scheduleEntries.$inferInsert> = {};
  if (body?.floor !== undefined) patch.floor = String(body.floor).trim();
  if (body?.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body?.startMin !== undefined) {
    if (!validTime(Number(body.startMin))) return Response.json({ error: "Ungültige Startzeit" }, { status: 400 });
    patch.startMin = Number(body.startMin);
  }
  if (body?.endMin !== undefined) {
    if (!validTime(Number(body.endMin))) return Response.json({ error: "Ungültige Endzeit" }, { status: 400 });
    patch.endMin = Number(body.endMin);
  }
  if (patch.startMin !== undefined && patch.endMin !== undefined && patch.endMin <= patch.startMin) {
    return Response.json({ error: "Ende muss nach Start liegen" }, { status: 400 });
  }
  const db = getDb();
  const updated = await db
    .update(scheduleEntries)
    .set(patch)
    .where(and(eq(scheduleEntries.id, Number(entryId)), eq(scheduleEntries.ressortId, Number(id))))
    .returning();
  if (!updated[0]) return Response.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  return Response.json({ entry: updated[0] });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; entryId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id, entryId } = await ctx.params;
  await getDb()
    .delete(scheduleEntries)
    .where(and(eq(scheduleEntries.id, Number(entryId)), eq(scheduleEntries.ressortId, Number(id))));
  return Response.json({ ok: true });
}
