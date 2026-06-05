import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession, setSessionCookie, verifyPassword, jsonError } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return jsonError("E-Mail und Passwort erforderlich", 400);

  const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return jsonError("E-Mail oder Passwort falsch", 401);
  }
  const token = await createSession(user.id);
  await setSessionCookie(token);
  return Response.json({ ok: true, mustChangePassword: user.mustChangePassword });
}
