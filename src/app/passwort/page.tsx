"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/components/AuthContext";

export default function ChangePasswordPage() {
  const { user, loading, refresh, logout } = useAuth();
  const router = useRouter();
  const [forced, setForced] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForced(new URLSearchParams(window.location.search).get("forced") === "1");
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError("Neues Passwort muss mindestens 6 Zeichen haben.");
    if (newPassword !== confirm) return setError("Die beiden Passwörter stimmen nicht überein.");
    setSaving(true);
    try {
      await api.post("/auth/change-password", forced ? { newPassword } : { currentPassword, newPassword });
      await refresh();
      setDone(true);
      if (forced) router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const wrapperClass = forced
    ? "auth-bg flex min-h-screen flex-col items-center justify-center px-6 py-12"
    : "mx-auto max-w-md px-4 py-8";

  return (
    <div className={wrapperClass}>
      <div className="w-full max-w-sm">
        {forced ? (
          <div className="mb-6 text-center text-white">
            <h1 className="text-2xl font-bold">Willkommen!</h1>
            <p className="mt-1 text-white/80">Bitte lege zuerst ein eigenes Passwort fest.</p>
          </div>
        ) : (
          <h1 className="mb-4 text-2xl font-bold">Passwort ändern</h1>
        )}

        <form onSubmit={submit} className="card space-y-4 p-6">
          {!forced && (
            <div>
              <label className="label">Aktuelles Passwort</label>
              <input
                type="password"
                autoComplete="current-password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="label">Neues Passwort</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Neues Passwort bestätigen</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {done && !forced && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Passwort aktualisiert.</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Speichern …" : "Passwort speichern"}
          </button>
          {forced ? (
            <button type="button" className="btn-ghost w-full" onClick={() => logout().then(() => router.replace("/login"))}>
              Abmelden
            </button>
          ) : (
            <button type="button" className="btn-ghost w-full" onClick={() => router.push("/")}>
              Zurück
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
