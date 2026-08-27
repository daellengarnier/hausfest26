// Export des Anlass-Programms (Line-up + Öffnungszeiten Bars) als Markdown.
// Läuft eigenständig gegen DATABASE_URL – auch im Produktions-Container, da nur
// der `postgres`-Treiber (kein TS-Schema) verwendet wird.
//
//   docker compose exec -T <service> node scripts/export-programm.mjs
//
// Zeiten sind als Minuten ab 16:00 gespeichert (0 = 16:00 … 960 = 08:00 Folgetag).
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[export] DATABASE_URL fehlt.");
  process.exit(1);
}

// Minuten ab 16:00 → „HH:MM" (mit „(+1)" wenn nach Mitternacht).
function clock(min) {
  const total = 16 * 60 + Number(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const nextDay = h >= 24;
  const hh = String(h % 24).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}${nextDay ? " (+1)" : ""}`;
}
const span = (a, b) => `${clock(a)}–${clock(b)}`;

const sql = postgres(url, { max: 1, prepare: false });

try {
  const ressorts = await sql`SELECT id, name FROM ressorts`;
  const rName = new Map(ressorts.map((r) => [r.id, r.name]));

  const floors = await sql`SELECT "ressortId", board, name, reihenfolge FROM schedule_floors ORDER BY reihenfolge, name`;
  const entries = await sql`
    SELECT e."ressortId", e.board, e.floor, e.titel, e."startMin", e."endMin", e.notiz, e."actId",
           a."getIn", a.soundcheck, a.typ
    FROM schedule_entries e
    LEFT JOIN acts a ON a.id = e."actId"
    ORDER BY e."startMin", e."endMin"`;
  const markers = await sql`SELECT "ressortId", board, titel, "startMin", "endMin" FROM schedule_markers ORDER BY "startMin"`;
  const actsNoLineup = await sql`
    SELECT a.name, a.typ, a."getIn", a.soundcheck
    FROM acts a
    WHERE NOT EXISTS (SELECT 1 FROM schedule_entries e WHERE e."actId" = a.id AND e.board = 'programm')
    ORDER BY a.name`;

  const out = [];
  out.push(`# Hausfest 26 — Programm`);
  out.push(`33 Jahre Via · 10 Jahre Spinnerei — Sa 5.9.26`);
  out.push(`Export: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Zeiten Start 16:00\n`);

  const boardTitle = { programm: "Line-up (Programm)", bars: "Öffnungszeiten Bars" };
  for (const board of ["programm", "bars"]) {
    out.push(`\n## ${boardTitle[board]}`);

    const bMarkers = markers.filter((m) => m.board === board);
    if (bMarkers.length) {
      out.push(`\n**Zeitfenster:**`);
      for (const m of bMarkers) out.push(`- ${span(m.startMin, m.endMin)} — ${m.titel || "—"}`);
    }

    const bEntries = entries.filter((e) => e.board === board);
    if (!bEntries.length) {
      out.push(`\n_(keine Einträge)_`);
      continue;
    }

    // Floor-Reihenfolge aus schedule_floors, Rest alphabetisch hinten dran.
    const order = floors.filter((f) => f.board === board).map((f) => f.floor ?? f.name);
    const floorNames = [...new Set(bEntries.map((e) => e.floor || "—"))].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib) || a.localeCompare(b);
    });

    for (const fl of floorNames) {
      out.push(`\n### ${fl}`);
      const rows = bEntries.filter((e) => (e.floor || "—") === fl);
      for (const e of rows) {
        const extra = [];
        if (board === "programm") {
          if (e.getIn) extra.push(`Get-in ${e.getIn}`);
          if (e.soundcheck) extra.push(`Soundcheck ${e.soundcheck}`);
          if (e.typ) extra.push(e.typ);
        }
        if (e.notiz) extra.push(e.notiz.replace(/\s+/g, " ").trim());
        const suffix = extra.length ? `  ·  ${extra.join(" · ")}` : "";
        out.push(`- **${span(e.startMin, e.endMin)}**  ${e.titel || "—"}${suffix}`);
      }
    }
  }

  if (actsNoLineup.length) {
    out.push(`\n## Acts ohne Line-up-Zeit (noch nicht eingeplant)`);
    for (const a of actsNoLineup) {
      const t = [a.typ, a.getIn && `Get-in ${a.getIn}`, a.soundcheck && `Soundcheck ${a.soundcheck}`].filter(Boolean).join(" · ");
      out.push(`- ${a.name || "—"}${t ? `  ·  ${t}` : ""}`);
    }
  }

  console.log(out.join("\n"));
} catch (err) {
  console.error("[export] Fehler:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
