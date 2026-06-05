import { sql, eq, and, ne, count, max } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { ressorts, ressortLeads, users, todos } from "@/lib/db/schema";

async function leadsFor(ressortId: number) {
  return getDb()
    .select({ id: users.id, name: users.name, avatarColor: users.avatarColor })
    .from(ressortLeads)
    .innerJoin(users, eq(users.id, ressortLeads.userId))
    .where(eq(ressortLeads.ressortId, ressortId))
    .orderBy(users.name);
}

// Dashboard: alle Ressorts mit Kennzahlen.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const list = await db.select().from(ressorts).orderBy(ressorts.reihenfolge, ressorts.id);

  const result = await Promise.all(
    list.map(async (r) => {
      const open = await db
        .select({ c: count() })
        .from(todos)
        .where(and(eq(todos.ressortId, r.id), ne(todos.status, "erledigt")));
      const total = await db.select({ c: count() }).from(todos).where(eq(todos.ressortId, r.id));

      const nextMeetingRows = await db.execute(sql`
        SELECT m.id, m.titel, ms.datum, ms.startzeit
        FROM meetings m JOIN meeting_slots ms ON ms.id = m."fixierterSlotId"
        WHERE m."ressortId" = ${r.id} AND m.status = 'terminFixiert'
          AND ms.datum >= to_char(now(), 'YYYY-MM-DD')
        ORDER BY ms.datum, ms.startzeit LIMIT 1
      `);
      const lastActRows = await db.execute(sql`
        SELECT MAX(ts) AS ts FROM (
          SELECT "createdAt" AS ts FROM comments WHERE "parentTyp"='ressort' AND "parentId"=${r.id}
          UNION ALL
          SELECT c."createdAt" FROM comments c JOIN todos t ON t.id=c."parentId"
            WHERE c."parentTyp"='todo' AND t."ressortId"=${r.id}
          UNION ALL
          SELECT "updatedAt" FROM todos WHERE "ressortId"=${r.id}
        ) x
      `);

      return {
        ...r,
        leads: await leadsFor(r.id),
        openTodos: open[0].c,
        totalTodos: total[0].c,
        nextMeeting: nextMeetingRows[0] ?? null,
        lastActivity: lastActRows[0]?.ts ?? null,
      };
    }),
  );
  return Response.json({ ressorts: result });
}

// Admin: oberstes Ressort anlegen.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "Name erforderlich" }, { status: 400 });

  const db = getDb();
  const maxRow = await db.select({ m: max(ressorts.reihenfolge) }).from(ressorts);
  const inserted = await db
    .insert(ressorts)
    .values({
      name,
      beschreibung: String(body?.beschreibung ?? ""),
      farbe: String(body?.farbe ?? "#6366f1"),
      reihenfolge: (maxRow[0].m ?? 0) + 1,
    })
    .returning({ id: ressorts.id });
  const id = inserted[0].id;
  if (Array.isArray(body?.leadUserIds) && body.leadUserIds.length > 0) {
    await db.insert(ressortLeads).values(
      body.leadUserIds.map((uid: number) => ({ ressortId: id, userId: Number(uid) })),
    );
  }
  return Response.json({ id }, { status: 201 });
}
