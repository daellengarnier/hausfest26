import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { attachments } from "@/lib/db/schema";
import { scanReceipt } from "@/lib/vision";

// Beleg per KI auslesen (Betrag/Datum/Händler/Kategorie-Vorschlag).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const attachmentId = Number(body?.attachmentId);
  if (!attachmentId) return Response.json({ error: "attachmentId erforderlich" }, { status: 400 });

  const rows = await getDb()
    .select({ dataB64: attachments.dataB64, mime: attachments.mime })
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);
  if (!rows[0]) return Response.json({ error: "Beleg nicht gefunden" }, { status: 404 });

  const result = await scanReceipt(rows[0].dataB64, rows[0].mime);
  return Response.json(result);
}
