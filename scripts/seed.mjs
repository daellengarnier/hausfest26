// Idempotenter Seed: legt beim ersten Start Accounts + Ressorts an.
// Wird im Entrypoint nach der Migration ausgeführt (überspringt, wenn
// bereits Nutzer existieren). Manuell: `npm run db:seed`.
import postgres from "postgres";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL fehlt — Seed abgebrochen.");
  process.exit(1);
}
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "spinnfest";

const USERS = [
  { name: "Alain", rolle: "admin", color: "#6366f1" },
  { name: "Zoe", rolle: "mitglied", color: "#ec4899" },
  { name: "Bäscht", rolle: "mitglied", color: "#f97316" },
  { name: "Reto", rolle: "mitglied", color: "#22c55e" },
  { name: "Ambar", rolle: "mitglied", color: "#06b6d4" },
  { name: "Lucien", rolle: "mitglied", color: "#eab308" },
  { name: "Dällen", rolle: "mitglied", color: "#8b5cf6" },
  { name: "Nando", rolle: "mitglied", color: "#ef4444" },
];

const RESSORTS = [
  { name: "Line-up", farbe: "#ec4899", leads: ["Zoe", "Bäscht"], subs: ["Line-Up Club (Spinnerei)", "Line-Up DJs (Alternativfloor & Spinnerei)"] },
  { name: "Essen", farbe: "#f97316", leads: ["Reto"], subs: [] },
  { name: "Getränke", farbe: "#06b6d4", leads: ["Ambar"], subs: [] },
  { name: "Technik", farbe: "#64748b", leads: ["Bäscht"], subs: [] },
  { name: "Promo", farbe: "#eab308", leads: ["Lucien"], subs: [] },
  { name: "Deko", farbe: "#22c55e", leads: ["Lucien"], subs: ["Treppenhaus", "Club", "Pyramide", "Garten", "WG Nordwind", "WG Ostblock", "WG Dreiecksbar", "WG Kleenex", "Family-WG", "WG Bonzen"] },
  { name: "Sicherheit & Awareness", farbe: "#ef4444", leads: ["Ambar", "Dällen"], subs: ["Fluchtplan", "Awareness", "Sanipoint", "Sicherheitskonzept"] },
  { name: "Finanzen", farbe: "#8b5cf6", leads: ["Nando"], subs: ["Budget/Abrechnung", "Defizitgarantie"] },
];

function emailFor(name) {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
  return `${slug}@fest.felsenau.org`;
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const existing = await sql`SELECT COUNT(*)::int AS c FROM users`;
  if (existing[0].c > 0) {
    console.log("[seed] Es existieren bereits Nutzer — Seed übersprungen.");
    await sql.end({ timeout: 5 });
    process.exit(0);
  }

  const hash = bcrypt.hashSync(SEED_PASSWORD, 10);
  const userIdByName = new Map();

  await sql.begin(async (tx) => {
    for (const u of USERS) {
      const [row] = await tx`
        INSERT INTO users (name, email, "passwordHash", rolle, "avatarColor", "mustChangePassword")
        VALUES (${u.name}, ${emailFor(u.name)}, ${hash}, ${u.rolle}, ${u.color}, true)
        RETURNING id`;
      userIdByName.set(u.name, row.id);
    }
    let order = 1;
    for (const r of RESSORTS) {
      const [row] = await tx`
        INSERT INTO ressorts (name, beschreibung, farbe, reihenfolge)
        VALUES (${r.name}, ${""}, ${r.farbe}, ${order++})
        RETURNING id`;
      const ressortId = row.id;
      for (const leadName of r.leads) {
        const uid = userIdByName.get(leadName);
        if (uid) await tx`INSERT INTO ressort_leads ("ressortId", "userId") VALUES (${ressortId}, ${uid}) ON CONFLICT DO NOTHING`;
      }
      let sOrder = 1;
      for (const sub of r.subs) {
        await tx`INSERT INTO sub_ressorts ("ressortId", name, reihenfolge) VALUES (${ressortId}, ${sub}, ${sOrder++})`;
      }
    }
  });

  console.log(
    `[seed] Fertig: ${USERS.length} Accounts, ${RESSORTS.length} Ressorts. ` +
      `Platzhalter-Passwort: "${SEED_PASSWORD}" (beim ersten Login zu ändern).`,
  );
} catch (err) {
  console.error("[seed] Fehler:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
