"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import { useAuth } from "@/components/AuthContext";
import type { RessortSummary } from "@/lib/uiTypes";

const TICKET_URL = "https://www.petzi.ch/en/organiser/236127/x2nv44btSyy-vzACtazc3A/";
const TICKET_PASSWORD = "viaspinnerei";
const SCHICHT_URL = "https://spinnplan-23.netlify.app?event=6f4b7584-2ca0-4687-8a8b-b0e4ba5f9387";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  if (h < 23) return "Guten Abend";
  return "Gute Nacht";
}

export default function WelcomePage() {
  const { user } = useAuth();
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hi, setHi] = useState("Hallo");

  useEffect(() => {
    setHi(greeting());
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="space-y-4">
      {/* Begrüssung – ausserhalb der Box, etwas grösser */}
      <h1 className="px-1 pt-1 text-2xl font-extrabold tracking-tight text-ink">
        {hi}, <span className="brand-text">{user?.name}</span>
      </h1>

      {/* Titel + Links – kompakte Box */}
      <div className="card p-4">
        <p className="text-lg font-extrabold tracking-tight text-ink">
          Hausfest <span className="brand-text">2026</span>
        </p>
        <p className="mt-0.5 text-sm text-stone-500">33 Jahre Via · 10 Jahre Spinnerei</p>

        {/* Buttons – kleiner */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={TICKET_URL} target="_blank" rel="noopener noreferrer" className="btn-primary py-2 text-sm">
            <Icon name="ticket" size={15} /> Tickets
          </a>
          <a href={SCHICHT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost py-2 text-sm">
            <Icon name="calendar" size={15} /> Schichtplan
          </a>
        </div>
        <p className="mt-2 text-center text-xs text-stone-500">
          Ticket-Passwort:{" "}
          <button
            onClick={() =>
              navigator.clipboard?.writeText(TICKET_PASSWORD).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              })
            }
            className="font-mono font-bold text-accent-dark underline decoration-dotted underline-offset-2"
          >
            {TICKET_PASSWORD}
          </button>
          {copied ? <span className="ml-1 text-accent">kopiert</span> : <span className="text-stone-400"> (tippen zum Kopieren)</span>}
        </p>
      </div>

      {/* Ressorts – kompakt */}
      <div>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-500">Ressorts</h2>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!ressorts ? (
          <Spinner label="Lade Ressorts …" />
        ) : ressorts.length === 0 ? (
          <EmptyState title="Noch keine Ressorts" hint={user?.rolle === "admin" ? "Lege im Admin-Bereich Ressorts an." : "Der Admin legt die Ressorts an."} />
        ) : (
          <div className="card divide-y divide-stone-100 overflow-hidden">
            {ressorts.map((r) => (
              <Link key={r.id} href={`/ressort/${r.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-stone-50">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset"
                  style={{ background: `${r.farbe}1c`, color: r.farbe, borderColor: `${r.farbe}3a` }}
                >
                  <Icon name={ressortIcon(r.name)} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{r.name}</p>
                    {r.hatZeitplan && <span className="chip bg-accent/10 text-accent-dark">Line-up</span>}
                    {r.hatActs && <span className="chip bg-accent/10 text-accent-dark">Acts</span>}
                  </div>
                </div>
                {r.openTodos > 0 && (
                  <span className="chip" style={{ background: `${r.farbe}1c`, color: r.farbe }}>
                    {r.openTodos} offen
                  </span>
                )}
                <Icon name="chevron" size={16} className="shrink-0 text-stone-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
