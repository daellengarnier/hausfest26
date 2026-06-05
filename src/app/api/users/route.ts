import { requireUser, isResponse } from "@/lib/auth";
import { allUsers } from "@/lib/notify";

// Alle eingeloggten Personen dürfen die Nutzerliste sehen (für @Mentions & Zuweisung).
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  return Response.json({ users: await allUsers() });
}
