import { requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function GET() {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      rolle: users.rolle,
      avatarColor: users.avatarColor,
      active: users.active,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);
  return Response.json({ users: rows });
}
