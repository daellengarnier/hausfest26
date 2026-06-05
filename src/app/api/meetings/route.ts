import { sql } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { meetings, meetingSlots, protocols } from "@/lib/db/schema";
import { allUsers, notifyMany } from "@/lib/notify";
import { meetingDetail } from "@/lib/meetingHelpers";

export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const rows = await getDb().execute(sql`
    SELECT m.id, m.titel, m.status, m."ressortId", m."fixierterSlotId",
           r.name AS "ressortName", r.farbe AS "ressortFarbe",
           u.name AS "organisatorName",
           fs.datum AS "fixDatum", fs.startzeit AS "fixStartzeit"
    FROM meetings m
    LEFT JOIN ressorts r ON r.id = m."ressortId"
    LEFT JOIN users u ON u.id = m."organisatorUserId"
    LEFT JOIN meeting_slots fs ON fs.id = m."fixierterSlotId"
    ORDER BY CASE m.status WHEN 'umfrage_laeuft' THEN 0 WHEN 'terminFixiert' THEN 1 ELSE 2 END,
             COALESCE(fs.datum, to_char(m."createdAt", 'YYYY-MM-DD'))
  `);
  return Response.json({ meetings: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const titel = String(body?.titel ?? "").trim();
  const slots = Array.isArray(body?.slots) ? body.slots : [];
  if (!titel || slots.length === 0) {
    return Response.json({ error: "titel und mind. ein Terminvorschlag erforderlich" }, { status: 400 });
  }
  const db = getDb();
  const actorId = auth.id;

  const inserted = await db
    .insert(meetings)
    .values({
      titel,
      beschreibung: String(body?.beschreibung ?? ""),
      organisatorUserId: actorId,
      ressortId: body?.ressortId ? Number(body.ressortId) : null,
      status: "umfrage_laeuft",
    })
    .returning({ id: meetings.id });
  const meetingId = inserted[0].id;

  const validSlots = slots.filter((s: { datum?: string }) => s?.datum);
  if (validSlots.length > 0) {
    await db.insert(meetingSlots).values(
      validSlots.map((s: { datum: string; startzeit?: string; endzeit?: string }) => ({
        meetingId,
        datum: String(s.datum),
        startzeit: String(s.startzeit ?? ""),
        endzeit: s.endzeit ? String(s.endzeit) : null,
      })),
    );
  }
  await db.insert(protocols).values({ meetingId, inhalt: "", aktualisiertVon: actorId });

  // Alle anderen aktiven Personen über die neue Sitzung informieren (Einladung).
  const everyone = await allUsers();
  await notifyMany(
    everyone.map((u) => ({
      userId: u.id,
      actorUserId: actorId,
      typ: "sitzung" as const,
      text: `${auth.name} hat eine Sitzung erstellt: „${titel}" – bitte Verfügbarkeit angeben`,
      refTyp: "meeting",
      refId: meetingId,
    })),
  );
  return Response.json(await meetingDetail(meetingId), { status: 201 });
}
