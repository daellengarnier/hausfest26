import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUser, hashPassword, verifyPassword, jsonError } from "@/lib/auth";

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return jsonError("Nicht angemeldet", 401);
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  if (newPassword.length < 6) return jsonError("Neues Passwort muss mind. 6 Zeichen haben", 400);

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  const user = rows[0];
  if (!user) return jsonError("Nutzer nicht gefunden", 404);

  // Beim erzwungenen Erstwechsel ist kein aktuelles Passwort nötig.
  if (!user.mustChangePassword) {
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
      return jsonError("Aktuelles Passwort falsch", 400);
    }
  }
  await db
    .update(users)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false })
    .where(eq(users.id, me.id));
  return Response.json({ ok: true });
}
