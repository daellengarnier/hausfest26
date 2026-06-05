import { eq, and } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { activityItems } from "@/lib/db/schema";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  await getDb()
    .update(activityItems)
    .set({ gelesen: true })
    .where(and(eq(activityItems.id, Number(id)), eq(activityItems.userId, auth.id)));
  return Response.json({ ok: true });
}
