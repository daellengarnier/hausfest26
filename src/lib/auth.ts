// Server-seitige Auth: Cookie-Sessions (HttpOnly), bcrypt-Hashing.
import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import type { Rolle } from "@/lib/db/schema";

export const SESSION_COOKIE = "hausfest_sid";
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? "30");

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  rolle: Rolle;
  avatarColor: string;
  mustChangePassword: boolean;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await getDb().insert(sessions).values({ token, userId, expiresAt });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const secureEnv = process.env.COOKIE_SECURE ?? "auto";
  const secure =
    secureEnv === "true" ? true : secureEnv === "false" ? false : process.env.NODE_ENV === "production";
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function destroySession(token: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.token, token));
}

// Liefert die aktuell eingeloggte Person oder null (über das Session-Cookie).
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      rolle: users.rolle,
      avatarColor: users.avatarColor,
      mustChangePassword: users.mustChangePassword,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    rolle: row.rolle,
    avatarColor: row.avatarColor,
    mustChangePassword: row.mustChangePassword,
  };
}

// Hilfs-Wrapper für Route Handler.
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function requireUser(): Promise<AuthUser | Response> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nicht angemeldet", 401);
  return user;
}

export async function requireAdmin(): Promise<AuthUser | Response> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nicht angemeldet", 401);
  if (user.rolle !== "admin") return jsonError("Nur für Admins", 403);
  return user;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}
