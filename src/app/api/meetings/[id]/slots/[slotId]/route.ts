import { eq, and } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetingSlots } from "@/lib/db/schema";
import { meetingDetail } from "@/lib/meetingHelpers";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; slotId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id, slotId } = await ctx.params;
  const meetingId = Number(id);
  await getDb()
    .delete(meetingSlots)
    .where(and(eq(meetingSlots.id, Number(slotId)), eq(meetingSlots.meetingId, meetingId)));
  return Response.json(await meetingDetail(meetingId));
}
