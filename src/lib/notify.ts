// @Mention-Erkennung + Anlegen von Inbox-Benachrichtigungen.
import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityItems, users } from "@/lib/db/schema";
import type { ActivityTyp } from "@/lib/db/schema";

export interface UserLite {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
}

export async function allUsers(): Promise<UserLite[]> {
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, avatarColor: users.avatarColor })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.name);
  return rows;
}

// Erkennt @Mentions: @ gefolgt von Name (ohne Leerzeichen) oder Vorname, case-insensitive.
export function parseMentions(text: string, usersList: UserLite[]): number[] {
  const tokens: string[] = [];
  const regex = /@([\p{L}0-9._-]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) tokens.push(m[1].toLowerCase());
  const found = new Set<number>();
  for (const u of usersList) {
    const handle = u.name.toLowerCase().replace(/\s+/g, "");
    const first = u.name.split(/\s+/)[0].toLowerCase();
    if (tokens.includes(handle) || tokens.includes(first)) found.add(u.id);
  }
  return [...found];
}

export interface NotifyInput {
  userId: number;
  actorUserId: number | null;
  typ: ActivityTyp;
  text: string;
  refTyp: string;
  refId: number;
}

// Legt Benachrichtigungen an – nie für die handelnde Person selbst.
export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  const filtered = inputs.filter((i) => i.userId !== i.actorUserId);
  if (filtered.length === 0) return;
  await getDb().insert(activityItems).values(filtered);
}
