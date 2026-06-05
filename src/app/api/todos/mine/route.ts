import { eq, desc, asc, sql } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { todos, todoAssignees, ressorts, comments, commentMentions, users } from "@/lib/db/schema";

// "Meine Sachen": mir zugewiesene Todos + @mich erwähnt.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const uid = auth.id;

  const assigned = await db
    .select({
      id: todos.id,
      ressortId: todos.ressortId,
      subRessortId: todos.subRessortId,
      titel: todos.titel,
      beschreibung: todos.beschreibung,
      status: todos.status,
      fristDatum: todos.fristDatum,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
      ressortName: ressorts.name,
      ressortFarbe: ressorts.farbe,
    })
    .from(todoAssignees)
    .innerJoin(todos, eq(todos.id, todoAssignees.todoId))
    .innerJoin(ressorts, eq(ressorts.id, todos.ressortId))
    .where(eq(todoAssignees.userId, uid))
    .orderBy(asc(todos.status), sql`${todos.fristDatum} NULLS LAST`);

  const mentioned = await db
    .select({
      commentId: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      parentTyp: comments.parentTyp,
      parentId: comments.parentId,
      autorName: users.name,
      autorColor: users.avatarColor,
    })
    .from(commentMentions)
    .innerJoin(comments, eq(comments.id, commentMentions.commentId))
    .leftJoin(users, eq(users.id, comments.autorUserId))
    .where(eq(commentMentions.userId, uid))
    .orderBy(desc(comments.createdAt))
    .limit(50);

  return Response.json({ assigned, mentioned });
}
