import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { todos, todoAssignees, users, ressorts, subRessorts } from "@/lib/db/schema";
import { notifyMany } from "@/lib/notify";

export async function assigneesFor(todoId: number) {
  return getDb()
    .select({ id: users.id, name: users.name, avatarColor: users.avatarColor })
    .from(todoAssignees)
    .innerJoin(users, eq(users.id, todoAssignees.userId))
    .where(eq(todoAssignees.todoId, todoId));
}

// Setzt Zuständige neu und benachrichtigt die neu Hinzugefügten.
export async function setAssignees(
  todoId: number,
  userIds: number[],
  actorId: number,
  todoTitel: string,
): Promise<void> {
  const db = getDb();
  const before = (await db
    .select({ userId: todoAssignees.userId })
    .from(todoAssignees)
    .where(eq(todoAssignees.todoId, todoId))).map((r) => r.userId);

  await db.delete(todoAssignees).where(eq(todoAssignees.todoId, todoId));
  if (userIds.length > 0) {
    await db
      .insert(todoAssignees)
      .values(userIds.map((uid) => ({ todoId, userId: uid })))
      .onConflictDoNothing();
  }
  const added = userIds.filter((uid) => !before.includes(uid));
  await notifyMany(
    added.map((uid) => ({
      userId: uid,
      actorUserId: actorId,
      typ: "zuweisung" as const,
      text: `Dir wurde das Todo „${todoTitel}" zugewiesen`,
      refTyp: "todo",
      refId: todoId,
    })),
  );
}

export async function todoWithDetail(id: number) {
  const db = getDb();
  const rows = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
  const todo = rows[0];
  if (!todo) return null;
  const ressort = (
    await db
      .select({ id: ressorts.id, name: ressorts.name, farbe: ressorts.farbe })
      .from(ressorts)
      .where(eq(ressorts.id, todo.ressortId))
      .limit(1)
  )[0];
  const subRessort = todo.subRessortId
    ? (
        await db
          .select({ id: subRessorts.id, name: subRessorts.name })
          .from(subRessorts)
          .where(eq(subRessorts.id, todo.subRessortId))
          .limit(1)
      )[0] ?? null
    : null;
  return { ...todo, assignees: await assigneesFor(id), ressort, subRessort };
}
