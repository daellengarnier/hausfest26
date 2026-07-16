"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Passwort muss mindestens 6 Zeichen haben.");
    if (password !== confirm) return setError("Die beiden Passwörter stimmen nicht überein.");
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, code: code.trim() || undefined });
      router.replace("/");
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
              <span className="h-3 w-3 rounded-full bg-rose-400" />
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Konto erstellen</h1>
          <p className="mt-1.5 text-white/75">Hausfest 26 – Orga der Spinnerei</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname" required />
          </div>
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mind. 6 Zeichen"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Passwort bestätigen</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="code">Einladungscode <span className="font-normal text-slate-400">(falls vorhanden)</span></label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Konto wird erstellt …" : "Registrieren"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Schon ein Konto?{" "}
            <Link href="/login" className="font-medium text-accent">
              Anmelden
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
