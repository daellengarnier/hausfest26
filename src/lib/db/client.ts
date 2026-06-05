// Postgres-Client. Lazy-initialisiert beim ersten Zugriff, damit
// Build-Zeit ohne DATABASE_URL funktioniert.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL nicht gesetzt");
  }
  const sql = postgres(url, { max: 5, prepare: false });
  _db = drizzle(sql);
  return _db;
}
