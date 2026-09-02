import { eq, and, count, asc, sql } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { ressorts, todos, todoAssignees, users, comments } from "@/lib/db/schema";
import type { TodoStatus } from "@/lib/db/schema";
import { setAssignees, todoWithDetail } from "@/lib/todoHelpers";

const STATUS: TodoStatus[] = ["offen", "in_arbeit", "erledigt"];

// Alle Todos (ressort-übergreifend) für den „Alle Todos"-Tab.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();

  const rows = await db
    .select({
      id: todos.id,
      ressortId: todos.ressortId,
      subRessortId: todos.subRessortId,
      titel: todos.titel,
      beschreibung: todos.beschreibung,
      status: todos.status,
      fristDatum: todos.fristDatum,
      erstelltVon: todos.erstelltVon,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
      ressortName: ressorts.name,
      ressortFarbe: ressorts.farbe,
    })
    .from(todos)
    .leftJoin(ressorts, eq(ressorts.id, todos.ressortId))
    .orderBy(asc(todos.status), sql`${todos.fristDatum} NULLS LAST`, todos.id);

  const full = await Promise.all(
    rows.map(async (t) => {
      const assignees = await db
        .select({ id: users.id, name: users.name, avatarColor: users.avatarColor })
        .from(todoAssignees)
        .innerJoin(users, eq(users.id, todoAssignees.userId))
        .where(eq(todoAssignees.todoId, t.id));
      const cc = await db
        .select({ c: count() })
        .from(comments)
        .where(and(eq(comments.parentTyp, "todo"), eq(comments.parentId, t.id)));
      return { ...t, assignees, commentCount: cc[0].c };
    }),
  );

  return Response.json({ todos: full });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = body?.ressortId ? Number(body.ressortId) : null;
  const titel = String(body?.titel ?? "").trim();
  if (!titel) return Response.json({ error: "titel erforderlich" }, { status: 400 });

  const db = getDb();
  if (ressortId) {
    const ressort = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
    if (!ressort[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });
  }

  const status: TodoStatus = STATUS.includes(body?.status) ? body.status : "offen";
  const inserted = await db
    .insert(todos)
    .values({
      ressortId,
      // Sub-Ressort nur sinnvoll mit Ressort.
      subRessortId: ressortId && body?.subRessortId ? Number(body.subRessortId) : null,
      titel,
      beschreibung: String(body?.beschreibung ?? ""),
      status,
      fristDatum: body?.fristDatum || null,
      erstelltVon: auth.id,
    })
    .returning({ id: todos.id });
  const id = inserted[0].id;
  if (Array.isArray(body?.assigneeIds)) {
    await setAssignees(id, body.assigneeIds.map(Number), auth.id, titel);
  }
  return Response.json({ todo: await todoWithDetail(id) }, { status: 201 });
}
