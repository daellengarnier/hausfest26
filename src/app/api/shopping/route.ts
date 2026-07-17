import { eq, asc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { shoppingItems, ressorts, subRessorts } from "@/lib/db/schema";

// Gesamte Einkaufsliste, gruppiert nach Ressort (inkl. Sub-Ressorts & Artikel).
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();

  const rs = await db.select().from(ressorts).orderBy(asc(ressorts.reihenfolge), asc(ressorts.id));
  const subs = await db.select().from(subRessorts).orderBy(asc(subRessorts.reihenfolge), asc(subRessorts.id));
  const items = await db
    .select({
      id: shoppingItems.id,
      ressortId: shoppingItems.ressortId,
      subRessortId: shoppingItems.subRessortId,
      titel: shoppingItems.titel,
      menge: shoppingItems.menge,
      erledigt: shoppingItems.erledigt,
    })
    .from(shoppingItems)
    .orderBy(asc(shoppingItems.erledigt), asc(shoppingItems.id));

  const result = rs.map((r) => ({
    id: r.id,
    name: r.name,
    farbe: r.farbe,
    subRessorts: subs.filter((s) => s.ressortId === r.id).map((s) => ({ id: s.id, name: s.name })),
    items: items.filter((i) => i.ressortId === r.id),
  }));
  return Response.json({ ressorts: result });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = Number(body?.ressortId);
  const titel = String(body?.titel ?? "").trim();
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });
  if (!titel) return Response.json({ error: "Artikel erforderlich" }, { status: 400 });

  const db = getDb();
  const r = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const subRessortId = body?.subRessortId ? Number(body.subRessortId) : null;
  const inserted = await db
    .insert(shoppingItems)
    .values({ ressortId, subRessortId, titel, menge: String(body?.menge ?? "").trim(), createdBy: auth.id })
    .returning({ id: shoppingItems.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
