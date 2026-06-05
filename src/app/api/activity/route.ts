import { eq, desc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { activityItems, users } from "@/lib/db/schema";

export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const items = await getDb()
    .select({
      id: activityItems.id,
      typ: activityItems.typ,
      text: activityItems.text,
      refTyp: activityItems.refTyp,
      refId: activityItems.refId,
      gelesen: activityItems.gelesen,
      createdAt: activityItems.createdAt,
      actorName: users.name,
      actorColor: users.avatarColor,
    })
    .from(activityItems)
    .leftJoin(users, eq(users.id, activityItems.actorUserId))
    .where(eq(activityItems.userId, auth.id))
    .orderBy(desc(activityItems.createdAt), desc(activityItems.id))
    .limit(100);
  return Response.json({ items });
}
