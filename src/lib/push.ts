import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";

let configured: boolean | null = null;

// VAPID nur einmal konfigurieren; ohne Schlüssel ist Push einfach deaktiviert.
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:orga@hausfest.al-daellen.ch", pub, priv);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

export function pushConfigured(): boolean {
  return ensureConfigured();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Schickt eine Push-Nachricht an alle Geräte der angegebenen Personen.
// Tote Abos (410/404) werden entfernt. Fehler werden geschluckt.
export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured() || userIds.length === 0) return;
  const db = getDb();
  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, [...new Set(userIds)]));
  if (subs.length === 0) return;
  const data = JSON.stringify(payload);
  const dead: number[] = [];
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );
  if (dead.length > 0) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
}
