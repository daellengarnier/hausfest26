import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { attachments } from "@/lib/db/schema";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Datei-Upload (Beleg, Rider …) – als base64 in der DB.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Keine Datei" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return Response.json({ error: "Leere Datei" }, { status: 400 });
  if (buf.length > MAX_BYTES) return Response.json({ error: "Datei zu groß (max. 8 MB)" }, { status: 413 });

  const inserted = await getDb()
    .insert(attachments)
    .values({
      filename: file.name || "datei",
      mime: file.type || "application/octet-stream",
      size: buf.length,
      dataB64: buf.toString("base64"),
      uploadedBy: auth.id,
    })
    .returning({ id: attachments.id, filename: attachments.filename, mime: attachments.mime, size: attachments.size });
  return Response.json({ attachment: inserted[0] }, { status: 201 });
}
