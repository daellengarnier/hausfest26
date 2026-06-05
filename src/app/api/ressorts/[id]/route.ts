import { sql, eq, and, count, asc, desc } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import {
  ressorts,
  ressortLeads,
  subRessorts,
  users,
  todos,
  todoAssignees,
  comments,
  protocols,
  meetings,
} from "@/lib/db/schema";

async function leadsFor(ressortId: number) {
  return getDb()
    .select({ id: users.id, name: users.name, avatarColor: users.avatarColor })
    .from(ressortLeads)
    .innerJoin(users, eq(users.id, ressortLeads.userId))
    .where(eq(ressortLeads.ressortId, ressortId))
    .orderBy(users.name);
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const db = getDb();

  const ressortRows = await db.select().from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  const ressort = ressortRows[0];
  if (!ressort) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const subs = await db
    .select()
    .from(subRessorts)
    .where(eq(subRessorts.ressortId, ressortId))
    .orderBy(subRessorts.reihenfolge, subRessorts.id);

  const todoRows = await db
    .select()
    .from(todos)
    .where(eq(todos.ressortId, ressortId))
    .orderBy(asc(todos.status), sql`${todos.fristDatum} NULLS LAST`, todos.id);

  const todosFull = await Promise.all(
    todoRows.map(async (t) => {
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

  const protocolRows = await db
    .select({
      id: protocols.id,
      meetingId: protocols.meetingId,
      titel: meetings.titel,
      updatedAt: protocols.updatedAt,
    })
    .from(protocols)
    .innerJoin(meetings, eq(meetings.id, protocols.meetingId))
    .where(and(eq(meetings.ressortId, ressortId), sql`trim(${protocols.inhalt}) != ''`))
    .orderBy(desc(protocols.updatedAt));

  return Response.json({
    ressort: { ...ressort, leads: await leadsFor(ressortId) },
    subRessorts: subs,
    todos: todosFull,
    protocols: protocolRows,
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const db = getDb();
  const existing = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!existing[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof ressorts.$inferInsert> = {};
  if (body?.name !== undefined) patch.name = String(body.name).trim();
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (body?.farbe !== undefined) patch.farbe = String(body.farbe);
  if (body?.reihenfolge !== undefined) patch.reihenfolge = Number(body.reihenfolge);
  if (Object.keys(patch).length > 0) await db.update(ressorts).set(patch).where(eq(ressorts.id, ressortId));

  if (Array.isArray(body?.leadUserIds)) {
    await db.delete(ressortLeads).where(eq(ressortLeads.ressortId, ressortId));
    if (body.leadUserIds.length > 0) {
      await db
        .insert(ressortLeads)
        .values(body.leadUserIds.map((uid: number) => ({ ressortId, userId: Number(uid) })))
        .onConflictDoNothing();
    }
  }
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  await getDb().delete(ressorts).where(eq(ressorts.id, Number(id)));
  return Response.json({ ok: true });
}
