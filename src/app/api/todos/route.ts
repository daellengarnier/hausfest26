import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { ressorts, todos } from "@/lib/db/schema";
import type { TodoStatus } from "@/lib/db/schema";
import { setAssignees, todoWithDetail } from "@/lib/todoHelpers";

const STATUS: TodoStatus[] = ["offen", "in_arbeit", "erledigt"];

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = Number(body?.ressortId);
  const titel = String(body?.titel ?? "").trim();
  if (!ressortId || !titel) return Response.json({ error: "ressortId und titel erforderlich" }, { status: 400 });

  const db = getDb();
  const ressort = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!ressort[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });

  const status: TodoStatus = STATUS.includes(body?.status) ? body.status : "offen";
  const inserted = await db
    .insert(todos)
    .values({
      ressortId,
      subRessortId: body?.subRessortId ? Number(body.subRessortId) : null,
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
