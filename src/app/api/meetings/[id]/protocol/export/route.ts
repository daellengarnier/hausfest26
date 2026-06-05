import { requireUser, isResponse } from "@/lib/auth";
import { meetingDetail } from "@/lib/meetingHelpers";

// Export des Protokolls als Markdown-Datei.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const detail = await meetingDetail(Number(id));
  if (!detail) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });

  const m = detail.meeting;
  const fixSlot = detail.slots.find((s) => s.id === m.fixierterSlotId);
  const lines: string[] = [];
  lines.push(`# Protokoll – ${m.titel}`, "");
  if (m.ressortName) lines.push(`**Ressort:** ${m.ressortName}`);
  if (m.organisatorName) lines.push(`**Organisation:** ${m.organisatorName}`);
  if (fixSlot)
    lines.push(
      `**Termin:** ${fixSlot.datum}${fixSlot.startzeit ? " " + fixSlot.startzeit : ""}${fixSlot.endzeit ? "–" + fixSlot.endzeit : ""}`,
    );
  lines.push("", "---", "");
  lines.push(detail.protocol?.inhalt || "_(noch kein Protokollinhalt)_", "");
  const md = lines.join("\n");
  const filename = `protokoll-${m.titel.replace(/[^\p{L}0-9]+/gu, "-").toLowerCase()}.md`;
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
