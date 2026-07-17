import { eq, desc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { expenses, users, attachments, ressorts } from "@/lib/db/schema";
import { normalizeCategory } from "@/lib/finance";

// Alle Ausgaben eines (Finanz-)Ressorts – alle sehen alles (Vertrauensmodell),
// Zusammenfassungen (meine / pro Kategorie / pro Person) rechnet der Client.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const ressortId = Number(new URL(request.url).searchParams.get("ressortId"));
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });

  const rows = await getDb()
    .select({
      id: expenses.id,
      betragCents: expenses.betragCents,
      waehrung: expenses.waehrung,
      kategorie: expenses.kategorie,
      beschreibung: expenses.beschreibung,
      datum: expenses.datum,
      createdAt: expenses.createdAt,
      userId: expenses.userId,
      userName: users.name,
      userColor: users.avatarColor,
      actId: expenses.actId,
      belegId: expenses.belegId,
      belegMime: attachments.mime,
      belegFilename: attachments.filename,
    })
    .from(expenses)
    .leftJoin(users, eq(users.id, expenses.userId))
    .leftJoin(attachments, eq(attachments.id, expenses.belegId))
    .where(eq(expenses.ressortId, ressortId))
    .orderBy(desc(expenses.datum), desc(expenses.id));
  return Response.json({ expenses: rows });
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
    .insert(expenses)
    .values({
      ressortId,
      userId: auth.id,
      betragCents,
      waehrung: "CHF",
      kategorie: normalizeCategory(body?.kategorie),
      beschreibung: String(body?.beschreibung ?? "").trim(),
      datum: body?.datum || null,
      belegId: body?.belegId ? Number(body.belegId) : null,
    })
    .returning({ id: expenses.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
