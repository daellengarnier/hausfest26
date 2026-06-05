"use client";

import { useState } from "react";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-accent to-accent-dark px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <span className="grid h-9 w-9 place-items-center rounded-full border-4 border-white">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-400" />
            </span>
          </div>
          <h1 className="text-3xl font-bold">Hausfest 26</h1>
          <p className="mt-1 text-white/80">Orga der Spinnerei</p>
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
              placeholder="name@fest.felsenau.org"
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
          <p className="text-center text-xs text-slate-400">Angemeldet bleiben ist standardmässig aktiv.</p>
        </form>
      </div>
    </div>
  );
}
