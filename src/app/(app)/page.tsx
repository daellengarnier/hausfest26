"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { AvatarStack, EmptyState, Spinner } from "@/components/Ui";
import { formatDate, relTime } from "@/lib/uiUtil";
import { ressortIcon } from "@/lib/ressortIcon";
import { useAuth } from "@/components/AuthContext";
import type { RessortSummary } from "@/lib/uiTypes";

export default function DashboardPage() {
  const { user } = useAuth();
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>;
  if (!ressorts) return <Spinner label="Lade Ressorts …" />;

  const totalOpen = ressorts.reduce((n, r) => n + r.openTodos, 0);

  return (
    <div className="space-y-5">
      <div className="pt-1">
        <p className="text-sm font-medium text-slate-500">Hoi {user?.name} 👋</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Übersicht</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {ressorts.length} Ressorts · {totalOpen} offene Todos
        </p>
      </div>

      {ressorts.length === 0 ? (
        <EmptyState
          icon="🎪"
          title="Noch keine Ressorts"
          hint={user?.rolle === "admin" ? "Lege im Admin-Bereich die obersten Ressorts an." : "Der Admin legt die Ressorts an."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ressorts.map((r) => (
            <Link
              key={r.id}
              href={`/ressort/${r.id}`}
              className="card group relative overflow-hidden p-4 transition active:scale-[0.99]"
            >
              {/* Farbiger Akzentstreifen oben */}
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: r.farbe }} />

              <div className="flex items-start gap-3">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ring-1 ring-inset"
                  style={{ background: `${r.farbe}1f`, color: r.farbe, borderColor: `${r.farbe}33` }}
                >
                  {ressortIcon(r.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate text-lg font-bold leading-tight">{r.name}</h2>
                    <AvatarStack users={r.leads} size={24} />
                  </div>
                  {r.beschreibung && <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{r.beschreibung}</p>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className="chip"
                  style={{
                    background: r.openTodos ? `${r.farbe}1f` : "#f1f5f9",
                    color: r.openTodos ? r.farbe : "#64748b",
                  }}
                >
                  {r.openTodos} offen{r.totalTodos > 0 ? ` / ${r.totalTodos}` : ""}
                </span>
                {r.hatZeitplan && <span className="chip bg-fuchsia-100 text-fuchsia-700">🎧 Zeitplan</span>}
                {r.nextMeeting && <span className="chip bg-slate-100 text-slate-600">📅 {formatDate(r.nextMeeting.datum)}</span>}
                <span className="ml-auto text-slate-400">{r.lastActivity ? relTime(r.lastActivity) : "still"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
