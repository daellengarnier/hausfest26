import { eq, and, ne, count } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession, setSessionCookie, hashPassword, jsonError } from "@/lib/auth";

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
  "#ec4899", "#f43f5e",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Selbst-Registrierung: eigene E-Mail + Passwort. Danach direkt eingeloggt.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const code = String(body?.code ?? "");

  if (!name) return jsonError("Name erforderlich", 400);
  if (!EMAIL_RE.test(email)) return jsonError("Bitte eine gültige E-Mail angeben", 400);
  if (password.length < 6) return jsonError("Passwort muss mindestens 6 Zeichen haben", 400);

  // Optionaler Einladungscode (falls gesetzt, muss er stimmen).
  const requiredCode = process.env.REGISTRATION_CODE;
  if (requiredCode && code !== requiredCode) {
    return jsonError("Ungültiger Einladungscode", 403);
  }

  const db = getDb();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Admin = erster echter (übernommener) Account; Platzhalter zählen nicht.
  const claimedCount = await db.select({ c: count() }).from(users).where(eq(users.claimed, true));
  const isAdmin = claimedCount[0].c === 0 || adminEmails.includes(email);

  // Vorbelegtes Profil (Platzhalter) mit exakt diesem Namen übernehmen?
  const placeholder = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.name, name), eq(users.claimed, false)))
    .limit(1);

  if (placeholder[0]) {
    const emailTaken = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, placeholder[0].id)))
      .limit(1);
    if (emailTaken[0]) return jsonError("Diese E-Mail ist bereits registriert", 409);
    await db
      .update(users)
      .set({ email, passwordHash: hashPassword(password), claimed: true, active: true, mustChangePassword: false, rolle: isAdmin ? "admin" : "mitglied" })
      .where(eq(users.id, placeholder[0].id));
    const token = await createSession(placeholder[0].id);
    await setSessionCookie(token);
    return Response.json({ ok: true, admin: isAdmin, claimed: true }, { status: 201 });
  }

  // Sonst: neues Konto anlegen.
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists[0]) return jsonError("Diese E-Mail ist bereits registriert", 409);

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const inserted = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      rolle: isAdmin ? "admin" : "mitglied",
      avatarColor: color,
      mustChangePassword: false,
    })
    .returning({ id: users.id });

  const token = await createSession(inserted[0].id);
  await setSessionCookie(token);
  return Response.json({ ok: true, admin: isAdmin }, { status: 201 });
}
