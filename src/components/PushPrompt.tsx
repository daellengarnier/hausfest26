"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { enablePush, pushSupported } from "@/lib/pushClient";

const SNOOZE_KEY = "hausfest-push-snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

// Dezenter Banner beim App-Start: fragt einmalig, ob Benachrichtigungen
// aktiviert werden sollen. Die eigentliche Erlaubnis holt der Klick (User-Geste).
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Sobald Push (irgendwo) aktiviert wurde, Banner sofort ausblenden.
    const onEnabled = () => setShow(false);
    window.addEventListener("hausfest:push-enabled", onEnabled);
    if (!pushSupported() || Notification.permission !== "default") {
      window.removeEventListener("hausfest:push-enabled", onEnabled);
      return;
    }
    try {
      const snoozed = localStorage.getItem(SNOOZE_KEY);
      if (snoozed && Date.now() - Number(snoozed) < SNOOZE_MS) {
        window.removeEventListener("hausfest:push-enabled", onEnabled);
        return;
      }
    } catch {
      /* ignorieren */
    }
    setShow(true);
    return () => window.removeEventListener("hausfest:push-enabled", onEnabled);
  }, []);

  if (!show) return null;

  const enable = async () => {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    if (r.ok) {
      await fetch("/api/push/test", { method: "POST", credentials: "include" }).catch(() => undefined);
      setMsg("Aktiviert – du solltest gleich eine Test-Benachrichtigung sehen.");
      setTimeout(() => setShow(false), 2200);
    } else {
      setMsg(r.error ?? "Hat nicht geklappt.");
    }
  };

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      /* ignorieren */
    }
    setShow(false);
  };

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon name="bell" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Benachrichtigungen aktivieren?</p>
          <p className="mt-0.5 text-sm text-stone-500">
            Erhalte einen Hinweis, wenn du erwähnt wirst oder ein Todo bekommst.
          </p>
          {msg && <p className="mt-1 text-xs text-accent-dark">{msg}</p>}
          {!msg && (
            <div className="mt-3 flex gap-2">
              <button className="btn-primary px-4 py-2 text-sm" onClick={enable} disabled={busy}>
                {busy ? "Aktiviere …" : "Aktivieren"}
              </button>
              <button className="btn-ghost px-4 py-2 text-sm" onClick={later}>
                Später
              </button>
            </div>
          )}
        </div>
        <button className="shrink-0 rounded-lg p-1 text-stone-300 hover:text-stone-500" onClick={later} aria-label="Schliessen">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
