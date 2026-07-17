import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

// Öffentliche Liste der vorbelegten, noch nicht übernommenen Profile –
// damit man sich bei der Registrierung per Namensauswahl eintragen kann.
export async function GET() {
  const rows = await getDb()
    .select({ id: users.id, name: users.name, avatarColor: users.avatarColor })
    .from(users)
    .where(eq(users.claimed, false))
    .orderBy(asc(users.name));
  return Response.json({ profiles: rows });
}
