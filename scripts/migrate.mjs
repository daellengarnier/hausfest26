// Standalone Migration-Runner. Wird im Docker-Entrypoint vor `node server.js`
// ausgeführt und wendet alle Drizzle-Migrationen aus ./drizzle an.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL fehlt — Migration abgebrochen.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql);

try {
  console.log("[migrate] Wende Drizzle-Migrationen aus ./drizzle an…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Fertig.");
} catch (err) {
  console.error("[migrate] Fehler:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
