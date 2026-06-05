import { eq, and, count } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { activityItems } from "@/lib/db/schema";

export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const rows = await getDb()
    .select({ c: count() })
    .from(activityItems)
    .where(and(eq(activityItems.userId, auth.id), eq(activityItems.gelesen, false)));
  return Response.json({ count: rows[0].c });
}
