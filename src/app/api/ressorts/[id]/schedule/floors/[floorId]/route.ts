import { eq, and } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { scheduleFloors, scheduleEntries } from "@/lib/db/schema";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string; floorId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id, floorId } = await ctx.params;
  const ressortId = Number(id);
  const db = getDb();
  const rows = await db
    .select()
    .from(scheduleFloors)
    .where(and(eq(scheduleFloors.id, Number(floorId)), eq(scheduleFloors.ressortId, ressortId)))
    .limit(1);
  const floor = rows[0];
  if (!floor) return Response.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof scheduleFloors.$inferInsert> = {};
  if (body?.name !== undefined) patch.name = String(body.name).trim();
  if (body?.farbe !== undefined) patch.farbe = String(body.farbe);
  if (body?.reihenfolge !== undefined) patch.reihenfolge = Number(body.reihenfolge);

  // Bei Umbenennung die zugehörigen Einträge (gleiches Board) mitziehen.
  if (patch.name && patch.name !== floor.name) {
    await db
      .update(scheduleEntries)
      .set({ floor: patch.name })
      .where(
        and(
          eq(scheduleEntries.ressortId, ressortId),
          eq(scheduleEntries.board, floor.board),
          eq(scheduleEntries.floor, floor.name),
        ),
      );
  }
  if (Object.keys(patch).length > 0) await db.update(scheduleFloors).set(patch).where(eq(scheduleFloors.id, floor.id));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; floorId: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id, floorId } = await ctx.params;
  const ressortId = Number(id);
  const db = getDb();
  const rows = await db
    .select({ name: scheduleFloors.name, board: scheduleFloors.board })
    .from(scheduleFloors)
    .where(and(eq(scheduleFloors.id, Number(floorId)), eq(scheduleFloors.ressortId, ressortId)))
    .limit(1);
  if (!rows[0]) return Response.json({ error: "Nicht gefunden" }, { status: 404 });

  await db
    .delete(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.ressortId, ressortId),
        eq(scheduleEntries.board, rows[0].board),
        eq(scheduleEntries.floor, rows[0].name),
      ),
    );
  await db.delete(scheduleFloors).where(eq(scheduleFloors.id, Number(floorId)));
  return Response.json({ ok: true });
}
