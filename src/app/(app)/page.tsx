"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { AvatarStack, EmptyState, Spinner } from "@/components/Ui";
import { formatDate } from "@/lib/uiUtil";
import { ressortIcon } from "@/lib/ressortIcon";
import { useAuth } from "@/components/AuthContext";
import type { RessortSummary } from "@/lib/uiTypes";

const TICKET_URL = "https://www.petzi.ch/en/organiser/236127/x2nv44btSyy-vzACtazc3A/";
const TICKET_PASSWORD = "viaspinnerei";

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
  const [hasFlyer, setHasFlyer] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hi, setHi] = useState("Hallo");

  useEffect(() => {
    setHi(greeting());
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, []);

  const featured = (ressorts ?? []).find((r) => r.hatZeitplan) ?? (ressorts ?? [])[0];
  const rest = (ressorts ?? []).filter((r) => r.id !== featured?.id);

  return (
    <div className="space-y-6">
      {/* Begrüssung */}
      <div className="pt-1">
        <p className="text-sm font-semibold text-accent-light">{hi},</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{user?.name} 👋</h1>
      </div>

      {/* Save-the-date Hero */}
      <div className="bubble-glow relative overflow-hidden rounded-[28px] p-5 text-white auth-bg">
        {/* dekorative Blasen */}
        <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-pink-400/25 blur-xl" />
        <span className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-cyan-300/20 blur-xl" />

        {hasFlyer && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/save-the-date.jpg"
            alt="Save the date – Jubiläums-Hausfest"
            className="mb-4 w-full rounded-2xl shadow-lg"
            onError={() => setHasFlyer(false)}
          />
        )}

        <div className="relative">
          <span className="chip bg-white/15 text-white ring-1 ring-white/25">🎉 Save the date</span>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight">
            Jubiläums-<span className="brand-text">Hausfest</span>
          </h2>
          <p className="mt-1 text-4xl font-black tracking-tight text-white">5.9.26</p>
          <p className="mt-2 text-sm text-white/75">10 Jahre Spinnerei · 33 Jahre ViA1</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {["Live-Musik", "DJs", "Bar", "Food", "Performance"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="card overflow-hidden p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎟️</span>
          <h3 className="text-lg font-bold">Tickets</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">Tickets laufen über Petzi – mit diesem Passwort:</p>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(TICKET_PASSWORD).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5 text-left"
        >
          <span className="font-mono text-base font-bold tracking-wide text-accent-dark">{TICKET_PASSWORD}</span>
          <span className="text-xs font-medium text-slate-400">{copied ? "kopiert ✓" : "tippen zum Kopieren"}</span>
        </button>
        <a href={TICKET_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full">
          Zu den Tickets ↗
        </a>
      </div>

      {/* Ressorts */}
      <div className="space-y-3">
        <h3 className="px-1 text-lg font-bold text-white">Ressorts</h3>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        {!ressorts ? (
          <Spinner label="Lade Ressorts …" />
        ) : ressorts.length === 0 ? (
          <EmptyState icon="🎪" title="Noch keine Ressorts" hint={user?.rolle === "admin" ? "Lege im Admin-Bereich Ressorts an." : "Der Admin legt die Ressorts an."} />
        ) : (
          <>
            {featured && <FeaturedTile r={featured} />}
            <div className="grid grid-cols-2 gap-3">
              {rest.map((r) => (
                <BubbleTile key={r.id} r={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedTile({ r }: { r: RessortSummary }) {
  return (
    <Link href={`/ressort/${r.id}`} className="card relative flex items-center gap-4 overflow-hidden p-4 active:scale-[0.99]">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: r.farbe }} />
      <span
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-3xl ring-1 ring-inset"
        style={{ background: `${r.farbe}1f`, color: r.farbe, borderColor: `${r.farbe}40` }}
      >
        {ressortIcon(r.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-xl font-extrabold">{r.name}</h2>
          {r.hatZeitplan && <span className="chip bg-fuchsia-100 text-fuchsia-700">Line-up</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="chip" style={{ background: `${r.farbe}1f`, color: r.farbe }}>
            {r.openTodos} offen
          </span>
          {r.nextMeeting && <span className="chip bg-slate-100 text-slate-600">📅 {formatDate(r.nextMeeting.datum)}</span>}
          <AvatarStack users={r.leads} size={22} />
        </div>
      </div>
      <span className="text-2xl text-slate-300">›</span>
    </Link>
  );
}

function BubbleTile({ r }: { r: RessortSummary }) {
  return (
    <Link href={`/ressort/${r.id}`} className="card relative flex flex-col gap-2 overflow-hidden p-4 active:scale-[0.99]">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: r.farbe }} />
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-full text-2xl ring-1 ring-inset" style={{ background: `${r.farbe}1f`, color: r.farbe, borderColor: `${r.farbe}40` }}>
          {ressortIcon(r.name)}
        </span>
        <AvatarStack users={r.leads} size={20} />
      </div>
      <div>
        <h2 className="truncate text-base font-bold leading-tight">{r.name}</h2>
        <span className="mt-1 inline-block chip" style={{ background: r.openTodos ? `${r.farbe}1f` : "#f1f5f9", color: r.openTodos ? r.farbe : "#64748b" }}>
          {r.openTodos} offen
        </span>
      </div>
    </Link>
  );
}
