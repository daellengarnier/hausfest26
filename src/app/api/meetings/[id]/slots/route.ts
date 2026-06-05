import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetingSlots } from "@/lib/db/schema";
import { meetingDetail } from "@/lib/meetingHelpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const meetingId = Number(id);
  const body = await request.json().catch(() => ({}));
  if (!body?.datum) return Response.json({ error: "datum erforderlich" }, { status: 400 });
  await getDb().insert(meetingSlots).values({
    meetingId,
    datum: String(body.datum),
    startzeit: String(body?.startzeit ?? ""),
    endzeit: body?.endzeit ? String(body.endzeit) : null,
  });
  return Response.json(await meetingDetail(meetingId), { status: 201 });
}
