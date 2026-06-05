import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { todos } from "@/lib/db/schema";
import type { TodoStatus } from "@/lib/db/schema";
import { setAssignees, todoWithDetail } from "@/lib/todoHelpers";

const STATUS: TodoStatus[] = ["offen", "in_arbeit", "erledigt"];

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const todo = await todoWithDetail(Number(id));
  if (!todo) return Response.json({ error: "Todo nicht gefunden" }, { status: 404 });
  return Response.json({ todo });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const todoId = Number(id);
  const db = getDb();
  const rows = await db.select({ id: todos.id, titel: todos.titel }).from(todos).where(eq(todos.id, todoId)).limit(1);
  const existing = rows[0];
  if (!existing) return Response.json({ error: "Todo nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof todos.$inferInsert> = {};
  if (body?.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (body?.status !== undefined && STATUS.includes(body.status)) patch.status = body.status;
  if (body?.fristDatum !== undefined) patch.fristDatum = body.fristDatum || null;
  if (body?.subRessortId !== undefined) patch.subRessortId = body.subRessortId ? Number(body.subRessortId) : null;
  patch.updatedAt = new Date();
  await db.update(todos).set(patch).where(eq(todos.id, todoId));

  if (Array.isArray(body?.assigneeIds)) {
    await setAssignees(
      todoId,
      body.assigneeIds.map(Number),
      auth.id,
      body?.titel !== undefined ? String(body.titel) : existing.titel,
    );
  }
  return Response.json({ todo: await todoWithDetail(todoId) });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  await getDb().delete(todos).where(eq(todos.id, Number(id)));
  return Response.json({ ok: true });
}
