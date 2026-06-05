import { eq, and } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetings, meetingSlots, slotVotes } from "@/lib/db/schema";
import { notifyMany } from "@/lib/notify";
import { meetingDetail } from "@/lib/meetingHelpers";

// Termin fixieren → Sitzung wird zum Protokoll-Container.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const meetingId = Number(id);
  const body = await request.json().catch(() => ({}));
  const slotId = Number(body?.slotId);
  const db = getDb();

  const m = await db.select({ titel: meetings.titel }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (!m[0]) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });
  const slotRows = await db
    .select({ id: meetingSlots.id, datum: meetingSlots.datum, startzeit: meetingSlots.startzeit })
    .from(meetingSlots)
    .where(and(eq(meetingSlots.id, slotId), eq(meetingSlots.meetingId, meetingId)))
    .limit(1);
  const slot = slotRows[0];
  if (!slot) return Response.json({ error: "Slot nicht gefunden" }, { status: 404 });

  await db.update(meetings).set({ status: "terminFixiert", fixierterSlotId: slot.id }).where(eq(meetings.id, meetingId));

  // Teilnehmende (alle, die abgestimmt haben) informieren.
  const voters = await db
    .selectDistinct({ userId: slotVotes.userId })
    .from(slotVotes)
    .innerJoin(meetingSlots, eq(meetingSlots.id, slotVotes.slotId))
    .where(eq(meetingSlots.meetingId, meetingId));
  await notifyMany(
    voters.map((v) => ({
      userId: v.userId,
      actorUserId: auth.id,
      typ: "sitzung" as const,
      text: `Termin fixiert: „${m[0].titel}" am ${slot.datum}${slot.startzeit ? " " + slot.startzeit : ""}`,
      refTyp: "meeting",
      refId: meetingId,
    })),
  );
  return Response.json(await meetingDetail(meetingId));
}
