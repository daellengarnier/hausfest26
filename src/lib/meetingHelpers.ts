import "server-only";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { meetings, meetingSlots, slotVotes, protocols, ressorts, users } from "@/lib/db/schema";

export async function slotsForMeeting(meetingId: number) {
  const db = getDb();
  const slots = await db
    .select()
    .from(meetingSlots)
    .where(eq(meetingSlots.meetingId, meetingId))
    .orderBy(asc(meetingSlots.datum), asc(meetingSlots.startzeit), asc(meetingSlots.id));

  return Promise.all(
    slots.map(async (s) => {
      const votes = await db
        .select({
          userId: slotVotes.userId,
          verfuegbarkeit: slotVotes.verfuegbarkeit,
          name: users.name,
          avatarColor: users.avatarColor,
        })
        .from(slotVotes)
        .innerJoin(users, eq(users.id, slotVotes.userId))
        .where(eq(slotVotes.slotId, s.id));
      return {
        ...s,
        votes,
        tally: {
          ja: votes.filter((v) => v.verfuegbarkeit === "ja").length,
          vielleicht: votes.filter((v) => v.verfuegbarkeit === "vielleicht").length,
          nein: votes.filter((v) => v.verfuegbarkeit === "nein").length,
        },
      };
    }),
  );
}

export async function meetingDetail(id: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: meetings.id,
      titel: meetings.titel,
      beschreibung: meetings.beschreibung,
      organisatorUserId: meetings.organisatorUserId,
      ressortId: meetings.ressortId,
      status: meetings.status,
      fixierterSlotId: meetings.fixierterSlotId,
      createdAt: meetings.createdAt,
      ressortName: ressorts.name,
      ressortFarbe: ressorts.farbe,
      organisatorName: users.name,
    })
    .from(meetings)
    .leftJoin(ressorts, eq(ressorts.id, meetings.ressortId))
    .leftJoin(users, eq(users.id, meetings.organisatorUserId))
    .where(eq(meetings.id, id))
    .limit(1);
  const meeting = rows[0];
  if (!meeting) return null;
  const protocolRows = await db.select().from(protocols).where(eq(protocols.meetingId, id)).limit(1);
  return { meeting, slots: await slotsForMeeting(id), protocol: protocolRows[0] ?? null };
}
