// Idempotenter Seed: legt beim ersten Start die feste Ressort-Struktur an.
// KEINE Benutzerkonten – die Leute registrieren sich selbst (eigene E-Mail +
// Passwort). Leads vergibt der Admin später im Admin-Bereich.
// Wird im Entrypoint nach der Migration ausgeführt. Manuell: `npm run db:seed`.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL fehlt — Seed abgebrochen.");
  process.exit(1);
}

// Ressorts gemäss Anforderungsprofil (Abschnitt 10), ohne Lead-Zuordnung.
const RESSORTS = [
  { name: "Programm", farbe: "#ec4899", zeitplan: true, subs: ["Line-Up Club (Spinnerei)", "Line-Up DJs (Alternativfloor & Spinnerei)"] },
  { name: "Essen", farbe: "#f97316", subs: [] },
  { name: "Getränke", farbe: "#06b6d4", subs: [] },
  { name: "Technik", farbe: "#64748b", subs: [] },
  { name: "Promo", farbe: "#eab308", subs: [] },
  { name: "Deko", farbe: "#22c55e", subs: ["Treppenhaus", "Club", "Pyramide", "Garten", "WG Nordwind", "WG Ostblock", "WG Dreiecksbar", "WG Kleenex", "Family-WG", "WG Bonzen"] },
  { name: "Sicherheit & Awareness", farbe: "#ef4444", subs: ["Fluchtplan", "Awareness", "Sanipoint", "Sicherheitskonzept"] },
  { name: "Finanzen", farbe: "#8b5cf6", finanzen: true, subs: ["Budget/Abrechnung", "Defizitgarantie"] },
];

const sql = postgres(url, { max: 1, prepare: false });

try {
  const existing = await sql`SELECT COUNT(*)::int AS c FROM ressorts`;
  if (existing[0].c > 0) {
    console.log("[seed] Ressorts existieren bereits — Seed übersprungen.");
    await sql.end({ timeout: 5 });
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    let order = 1;
    for (const r of RESSORTS) {
      const [row] = await tx`
        INSERT INTO ressorts (name, beschreibung, farbe, reihenfolge, "hatZeitplan", "hatFinanzen")
        VALUES (${r.name}, ${""}, ${r.farbe}, ${order++}, ${r.zeitplan ?? false}, ${r.finanzen ?? false})
        RETURNING id`;
      let sOrder = 1;
      for (const sub of r.subs) {
        await tx`INSERT INTO sub_ressorts ("ressortId", name, reihenfolge) VALUES (${row.id}, ${sub}, ${sOrder++})`;
      }
      if (r.zeitplan) {
        // Programm-Floors
        const floors = [
          ["Club", "#6366f1"],
          ["Ambient (EG Nord)", "#06b6d4"],
          ["Alternativfloor (Family-WG)", "#f43f5e"],
          ["Garten", "#22c55e"],
        ];
        let fOrder = 1;
        for (const [fname, fcolor] of floors) {
          await tx`INSERT INTO schedule_floors ("ressortId", board, name, farbe, reihenfolge) VALUES (${row.id}, 'programm', ${fname}, ${fcolor}, ${fOrder++})`;
        }
        // Bars (eigenes Board) inkl. Öffnungszeiten
        const bars = [
          ["Bar im Garten", "#22c55e", 0, 360, ""],
          ["Bar im Ostblock", "#f97316", 330, 960, "Snacks"],
        ];
        let bOrder = 1;
        for (const [bname, bcolor, bs, be, note] of bars) {
          await tx`INSERT INTO schedule_floors ("ressortId", board, name, farbe, reihenfolge) VALUES (${row.id}, 'bars', ${bname}, ${bcolor}, ${bOrder++})`;
          await tx`INSERT INTO schedule_entries ("ressortId", board, floor, titel, "startMin", "endMin") VALUES (${row.id}, 'bars', ${bname}, ${note}, ${bs}, ${be})`;
        }
        // Nachtessen als dezentes Zeitfenster im Programm-Board
        await tx`INSERT INTO schedule_markers ("ressortId", board, titel, "startMin", "endMin", farbe) VALUES (${row.id}, 'programm', 'Nachtessen', 120, 240, '#f59e0b')`;
      }
    }
  });

  console.log(
    `[seed] Fertig: ${RESSORTS.length} Ressorts angelegt. ` +
      `Benutzer registrieren sich selbst; der erste Account wird Admin.`,
  );
} catch (err) {
  console.error("[seed] Fehler:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
