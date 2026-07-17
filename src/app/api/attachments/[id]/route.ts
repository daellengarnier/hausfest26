import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { attachments } from "@/lib/db/schema";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const rows = await getDb().select().from(attachments).where(eq(attachments.id, Number(id))).limit(1);
  const a = rows[0];
  if (!a) return Response.json({ error: "Nicht gefunden" }, { status: 404 });

  const buf = Buffer.from(a.dataB64, "base64");
  const inline = a.mime.startsWith("image/") || a.mime === "application/pdf";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": a.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(a.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
