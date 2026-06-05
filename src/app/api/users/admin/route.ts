import { eq } from "drizzle-orm";
import { requireAdmin, isResponse, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
  "#ec4899", "#f43f5e",
];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!name || !email) return Response.json({ error: "Name und E-Mail erforderlich" }, { status: 400 });

  const db = getDb();
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists[0]) return Response.json({ error: "E-Mail bereits vergeben" }, { status: 409 });

  const pw = String(body?.password || process.env.SEED_PASSWORD || "spinnfest");
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const inserted = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(pw),
      rolle: body?.rolle === "admin" ? "admin" : "mitglied",
      avatarColor: color,
      mustChangePassword: true,
    })
    .returning({ id: users.id });
  return Response.json({ id: inserted[0].id, placeholderPassword: pw }, { status: 201 });
}
