import { eq, desc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { budgetItems, users, ressorts } from "@/lib/db/schema";
import { normalizeCategory } from "@/lib/finance";

// Budgetposten (Plan/Schätzung) eines (Finanz-)Ressorts. Kollaborativ –
// alle sehen alles; die Plan-vs-Ist-Auswertung rechnet der Client.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const ressortId = Number(new URL(request.url).searchParams.get("ressortId"));
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });

  const rows = await getDb()
    .select({
      id: budgetItems.id,
      kategorie: budgetItems.kategorie,
      titel: budgetItems.titel,
      betragCents: budgetItems.betragCents,
      beschreibung: budgetItems.beschreibung,
      createdAt: budgetItems.createdAt,
      createdBy: budgetItems.createdBy,
      createdByName: users.name,
      createdByColor: users.avatarColor,
    })
    .from(budgetItems)
    .leftJoin(users, eq(users.id, budgetItems.createdBy))
    .where(eq(budgetItems.ressortId, ressortId))
    .orderBy(desc(budgetItems.id));
  return Response.json({ budget: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = Number(body?.ressortId);
  const betragCents = Math.round(Number(body?.betragCents));
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });
  if (!Number.isFinite(betragCents) || betragCents <= 0) return Response.json({ error: "Betrag erforderlich" }, { status: 400 });

  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const inserted = await db
    .insert(budgetItems)
    .values({
      ressortId,
      createdBy: auth.id,
      betragCents,
      kategorie: normalizeCategory(body?.kategorie),
      titel: String(body?.titel ?? "").trim(),
      beschreibung: String(body?.beschreibung ?? "").trim(),
    })
    .returning({ id: budgetItems.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
