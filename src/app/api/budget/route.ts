import { asc, eq } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { categoryBudgets, appSettings } from "@/lib/db/schema";
import { normalizeCategory } from "@/lib/finance";

const DEFIZIT_KEY = "defizitgarantie_cents";

// Budget (Plan) je Kostenstelle + Defizitgarantie (separat, nicht im Budget).
// Lesen: alle; Setzen: Admin.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const rows = await db.select().from(categoryBudgets).orderBy(asc(categoryBudgets.kategorie));
  const s = await db.select().from(appSettings).where(eq(appSettings.key, DEFIZIT_KEY)).limit(1);
  const defizit = s[0] ? Number(s[0].value) : 0;
  return Response.json({
    budgets: rows.map((r) => ({ kategorie: r.kategorie, betragCents: r.betragCents })),
    defizitgarantieCents: Number.isFinite(defizit) ? defizit : 0,
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  // Defizitgarantie setzen.
  if (body?.defizitgarantieCents !== undefined) {
    const cents = Math.round(Number(body.defizitgarantieCents));
    if (!Number.isFinite(cents) || cents < 0) return Response.json({ error: "Ungültiger Betrag" }, { status: 400 });
    await db
      .insert(appSettings)
      .values({ key: DEFIZIT_KEY, value: String(cents) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: String(cents), updatedAt: new Date() } });
    return Response.json({ ok: true });
  }

  // Budget einer Kostenstelle setzen.
  const kategorie = normalizeCategory(body?.kategorie);
  const cents = Math.round(Number(body?.betragCents));
  if (!Number.isFinite(cents) || cents < 0) return Response.json({ error: "Ungültiger Betrag" }, { status: 400 });
  await db
    .insert(categoryBudgets)
    .values({ kategorie, betragCents: cents })
    .onConflictDoUpdate({ target: categoryBudgets.kategorie, set: { betragCents: cents } });
  return Response.json({ ok: true });
}
