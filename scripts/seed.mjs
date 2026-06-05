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
  { name: "Line-up", farbe: "#ec4899", subs: ["Line-Up Club (Spinnerei)", "Line-Up DJs (Alternativfloor & Spinnerei)"] },
  { name: "Essen", farbe: "#f97316", subs: [] },
  { name: "Getränke", farbe: "#06b6d4", subs: [] },
  { name: "Technik", farbe: "#64748b", subs: [] },
  { name: "Promo", farbe: "#eab308", subs: [] },
  { name: "Deko", farbe: "#22c55e", subs: ["Treppenhaus", "Club", "Pyramide", "Garten", "WG Nordwind", "WG Ostblock", "WG Dreiecksbar", "WG Kleenex", "Family-WG", "WG Bonzen"] },
  { name: "Sicherheit & Awareness", farbe: "#ef4444", subs: ["Fluchtplan", "Awareness", "Sanipoint", "Sicherheitskonzept"] },
  { name: "Finanzen", farbe: "#8b5cf6", subs: ["Budget/Abrechnung", "Defizitgarantie"] },
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
        INSERT INTO ressorts (name, beschreibung, farbe, reihenfolge)
        VALUES (${r.name}, ${""}, ${r.farbe}, ${order++})
        RETURNING id`;
      let sOrder = 1;
      for (const sub of r.subs) {
        await tx`INSERT INTO sub_ressorts ("ressortId", name, reihenfolge) VALUES (${row.id}, ${sub}, ${sOrder++})`;
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
