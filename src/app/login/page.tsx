"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { mustChangePassword } = await login(email.trim(), password);
      router.replace(mustChangePassword ? "/passwort?forced=1" : "/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 grid h-[68px] w-[68px] place-items-center rounded-[22px] bg-white/10 shadow-2xl ring-1 ring-white/25 backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-white">
              <span className="h-3 w-3 rounded-full bg-terra-light" />
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Hausfest 26</h1>
          <p className="mt-1.5 text-white/75">Orga der Spinnerei</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@al-daellen.ch"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Anmelden …" : "Anmelden"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-medium text-accent">
              Registrieren
            </Link>
          </p>
          <p className="text-center text-xs text-slate-400">Angemeldet bleiben ist standardmässig aktiv.</p>
        </form>
      </div>
    </div>
  );
}
