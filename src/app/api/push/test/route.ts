import { requireUser, isResponse } from "@/lib/auth";
import { sendPushToUsers, pushConfigured } from "@/lib/push";

// Test-Push an sich selbst (zum Prüfen, ob Benachrichtigungen ankommen).
export async function POST() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  if (!pushConfigured()) return Response.json({ error: "Push ist auf dem Server nicht konfiguriert" }, { status: 503 });
  await sendPushToUsers([auth.id], { title: "Hausfest 26", body: "Push funktioniert – du erhältst jetzt Benachrichtigungen.", url: "/inbox" });
  return Response.json({ ok: true });
}
