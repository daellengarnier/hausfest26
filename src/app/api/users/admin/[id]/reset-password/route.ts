import { eq } from "drizzle-orm";
import { requireAdmin, isResponse, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const userId = Number(id);
  const body = await request.json().catch(() => ({}));
  const pw = String(body?.password || process.env.SEED_PASSWORD || "spinnfest");
  const updated = await getDb()
    .update(users)
    .set({ passwordHash: hashPassword(pw), mustChangePassword: true })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (!updated[0]) return Response.json({ error: "Nutzer nicht gefunden" }, { status: 404 });
  return Response.json({ ok: true, placeholderPassword: pw });
}
