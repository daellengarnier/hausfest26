"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { AvatarStack, EmptyState, Spinner } from "@/components/Ui";
import { formatDate, relTime } from "@/lib/uiUtil";
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

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!ressorts) return <Spinner label="Lade Ressorts …" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Übersicht</h1>
        <p className="text-sm text-slate-500">Stand aller Ressorts auf einen Blick</p>
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
              className="card relative overflow-hidden p-4 active:scale-[0.99]"
              style={{ borderLeft: `5px solid ${r.farbe}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold leading-tight">{r.name}</h2>
                <AvatarStack users={r.leads} />
              </div>
              {r.beschreibung && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.beschreibung}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="chip"
                  style={{ background: r.openTodos ? `${r.farbe}1a` : "#f1f5f9", color: r.openTodos ? r.farbe : "#64748b" }}
                >
                  {r.openTodos} offen{r.totalTodos > 0 ? ` / ${r.totalTodos}` : ""}
                </span>
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
