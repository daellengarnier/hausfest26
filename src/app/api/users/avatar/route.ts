import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { users, attachments } from "@/lib/db/schema";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Eigenes Profilbild hochladen/ersetzen.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Keine Datei" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "Bitte ein Bild hochladen" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return Response.json({ error: "Leere Datei" }, { status: 400 });
  if (buf.length > MAX_BYTES) return Response.json({ error: "Bild zu groß (max. 5 MB)" }, { status: 413 });

  const db = getDb();
  const inserted = await db
    .insert(attachments)
    .values({ filename: file.name || "avatar", mime: file.type, size: buf.length, dataB64: buf.toString("base64"), uploadedBy: auth.id })
    .returning({ id: attachments.id });
  await db.update(users).set({ avatarAttachmentId: inserted[0].id }).where(eq(users.id, auth.id));
  return Response.json({ ok: true, attachmentId: inserted[0].id }, { status: 201 });
}

// Eigenes Profilbild entfernen.
export async function DELETE() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  await getDb().update(users).set({ avatarAttachmentId: null }).where(eq(users.id, auth.id));
  return Response.json({ ok: true });
}
