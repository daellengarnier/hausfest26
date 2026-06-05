import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { activityItems } from "@/lib/db/schema";

export async function POST() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  await getDb().update(activityItems).set({ gelesen: true }).where(eq(activityItems.userId, auth.id));
  return Response.json({ ok: true });
}
