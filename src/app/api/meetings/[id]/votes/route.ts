import { eq, and } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetingSlots, slotVotes } from "@/lib/db/schema";
import type { Verfuegbarkeit } from "@/lib/db/schema";
import { meetingDetail } from "@/lib/meetingHelpers";

const OPTIONS: Verfuegbarkeit[] = ["ja", "vielleicht", "nein"];

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const meetingId = Number(id);
  const body = await request.json().catch(() => ({}));
  const slotId = Number(body?.slotId);
  const verfuegbarkeit = body?.verfuegbarkeit as Verfuegbarkeit;
  if (!slotId || !OPTIONS.includes(verfuegbarkeit)) {
    return Response.json({ error: "slotId und verfuegbarkeit (ja|vielleicht|nein) erforderlich" }, { status: 400 });
  }
  const db = getDb();
  const slot = await db
    .select({ id: meetingSlots.id })
    .from(meetingSlots)
    .where(and(eq(meetingSlots.id, slotId), eq(meetingSlots.meetingId, meetingId)))
    .limit(1);
  if (!slot[0]) return Response.json({ error: "Slot nicht gefunden" }, { status: 404 });

  await db
    .insert(slotVotes)
    .values({ slotId, userId: auth.id, verfuegbarkeit })
    .onConflictDoUpdate({ target: [slotVotes.slotId, slotVotes.userId], set: { verfuegbarkeit } });
  return Response.json(await meetingDetail(meetingId));
}
