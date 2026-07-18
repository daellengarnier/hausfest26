import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";

const KEY = "invite_text";

export const DEFAULT_INVITE = `Die Via Felsenau lädt ein zum Hausfest! 🎉

Wir feiern 33 Jahre Via & 10 Jahre Spinnerei – und ihr seid dabei! Es erwarten euch Live-Bands & DJs bis in die Morgenstunden, Bars auf mehreren Floors, feines Essen und ein Kinderprogramm für die Kleinen.

📅 Sa, 5.9.26 · Spinnerei Felsenau
🎟 Tickets: https://www.petzi.ch/en/organiser/236127/x2nv44btSyy-vzACtazc3A/ (Passwort: viaspinnerei)

Alle Infos ebenfalls unter dem Link. Wir freuen uns auf euch!`;

// Einladungstext (SMS/WhatsApp). Lesen & Bearbeiten für alle Mitglieder.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const rows = await getDb().select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  return Response.json({ text: rows[0]?.value || DEFAULT_INVITE });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (!text) return Response.json({ error: "Text erforderlich" }, { status: 400 });
  await getDb()
    .insert(appSettings)
    .values({ key: KEY, value: text })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: text, updatedAt: new Date() } });
  return Response.json({ ok: true });
}
