import { cookies } from "next/headers";
import { SESSION_COOKIE, clearSessionCookie, destroySession } from "@/lib/auth";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  await clearSessionCookie();
  return Response.json({ ok: true });
}
