import { and, eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";

// Push-Abo dieses Geräts speichern (Upsert über die eindeutige Endpoint-URL).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const endpoint = String(body?.endpoint ?? "");
  const p256dh = String(body?.keys?.p256dh ?? "");
  const authKey = String(body?.keys?.auth ?? "");
  if (!endpoint || !p256dh || !authKey) return Response.json({ error: "Ungültiges Abo" }, { status: 400 });

  const db = getDb();
  await db
    .insert(pushSubscriptions)
    .values({ userId: auth.id, endpoint, p256dh, auth: authKey })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: auth.id, p256dh, auth: authKey } });
  return Response.json({ ok: true }, { status: 201 });
}

// Push-Abo dieses Geräts entfernen.
export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const endpoint = String(body?.endpoint ?? "");
  if (endpoint) {
    await getDb()
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, auth.id)));
  }
  return Response.json({ ok: true });
}
