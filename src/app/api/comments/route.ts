import { eq, and, asc } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import {
  comments,
  commentMentions,
  users,
  todos,
  ressorts,
  todoAssignees,
  ressortLeads,
} from "@/lib/db/schema";
import type { ParentTyp } from "@/lib/db/schema";
import { allUsers, parseMentions, notifyMany, type NotifyInput } from "@/lib/notify";

async function commentsFor(parentTyp: ParentTyp, parentId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      autorUserId: comments.autorUserId,
      autorName: users.name,
      autorColor: users.avatarColor,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.autorUserId))
    .where(and(eq(comments.parentTyp, parentTyp), eq(comments.parentId, parentId)))
    .orderBy(asc(comments.createdAt), asc(comments.id));

  return Promise.all(
    rows.map(async (r) => {
      const mentions = await db
        .select({ id: users.id, name: users.name })
        .from(commentMentions)
        .innerJoin(users, eq(users.id, commentMentions.userId))
        .where(eq(commentMentions.commentId, r.id));
      return { ...r, mentions };
    }),
  );
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const url = new URL(request.url);
  const parentTyp = url.searchParams.get("parentTyp") as ParentTyp | null;
  const parentId = Number(url.searchParams.get("parentId"));
  if ((parentTyp !== "todo" && parentTyp !== "ressort") || !parentId) {
    return Response.json({ error: "parentTyp (todo|ressort) und parentId erforderlich" }, { status: 400 });
  }
  return Response.json({ comments: await commentsFor(parentTyp, parentId) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const parentTyp = body?.parentTyp as ParentTyp;
  const parentId = Number(body?.parentId);
  const text = String(body?.text ?? "").trim();
  if ((parentTyp !== "todo" && parentTyp !== "ressort") || !parentId || !text) {
    return Response.json({ error: "parentTyp, parentId und text erforderlich" }, { status: 400 });
  }
  const db = getDb();
  const actorId = auth.id;

  // Parent prüfen + Label für Benachrichtigungstext.
  let parentLabel = "";
  if (parentTyp === "todo") {
    const t = await db.select({ titel: todos.titel }).from(todos).where(eq(todos.id, parentId)).limit(1);
    if (!t[0]) return Response.json({ error: "Todo nicht gefunden" }, { status: 404 });
    parentLabel = t[0].titel;
  } else {
    const r = await db.select({ name: ressorts.name }).from(ressorts).where(eq(ressorts.id, parentId)).limit(1);
    if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });
    parentLabel = r[0].name;
  }

  const usersList = await allUsers();
  const mentions = parseMentions(text, usersList);

  const inserted = await db
    .insert(comments)
    .values({ parentTyp, parentId, autorUserId: actorId, text })
    .returning({ id: comments.id });
  const commentId = inserted[0].id;
  if (mentions.length > 0) {
    await db.insert(commentMentions).values(mentions.map((uid) => ({ commentId, userId: uid }))).onConflictDoNothing();
  }

  // --- Benachrichtigungen ---
  const notified = new Set<number>([actorId]);
  const author = auth.name;
  const notifications: NotifyInput[] = [];

  for (const uid of mentions) {
    if (notified.has(uid)) continue;
    notifications.push({
      userId: uid,
      actorUserId: actorId,
      typ: "mention",
      text: `${author} hat dich erwähnt: „${parentLabel}"`,
      refTyp: parentTyp,
      refId: parentId,
    });
    notified.add(uid);
  }

  // Interessenten: Todo-Zuständige bzw. Ressort-Leads + bisherige Diskutant:innen.
  const interested = new Set<number>();
  if (parentTyp === "todo") {
    for (const r of await db.select({ userId: todoAssignees.userId }).from(todoAssignees).where(eq(todoAssignees.todoId, parentId)))
      interested.add(r.userId);
  } else {
    for (const r of await db.select({ userId: ressortLeads.userId }).from(ressortLeads).where(eq(ressortLeads.ressortId, parentId)))
      interested.add(r.userId);
  }
  const prev = await db
    .selectDistinct({ autorUserId: comments.autorUserId })
    .from(comments)
    .where(and(eq(comments.parentTyp, parentTyp), eq(comments.parentId, parentId)));
  for (const r of prev) if (r.autorUserId) interested.add(r.autorUserId);

  for (const uid of interested) {
    if (notified.has(uid)) continue;
    notifications.push({
      userId: uid,
      actorUserId: actorId,
      typ: "neuer_kommentar",
      text: `${author} hat kommentiert: „${parentLabel}"`,
      refTyp: parentTyp,
      refId: parentId,
    });
    notified.add(uid);
  }
  await notifyMany(notifications);

  const created = (await commentsFor(parentTyp, parentId)).find((c) => c.id === commentId);
  return Response.json({ comment: created }, { status: 201 });
}
