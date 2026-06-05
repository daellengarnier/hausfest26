import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetings } from "@/lib/db/schema";
import type { MeetingStatus } from "@/lib/db/schema";
import { meetingDetail } from "@/lib/meetingHelpers";

const STATUS: MeetingStatus[] = ["umfrage_laeuft", "terminFixiert", "erledigt"];

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const detail = await meetingDetail(Number(id));
  if (!detail) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });
  return Response.json(detail);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const meetingId = Number(id);
  const db = getDb();
  const existing = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (!existing[0]) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof meetings.$inferInsert> = {};
  if (body?.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (body?.status !== undefined && STATUS.includes(body.status)) patch.status = body.status;
  if (Object.keys(patch).length > 0) await db.update(meetings).set(patch).where(eq(meetings.id, meetingId));
  return Response.json(await meetingDetail(meetingId));
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  await getDb().delete(meetings).where(eq(meetings.id, Number(id)));
  return Response.json({ ok: true });
}
