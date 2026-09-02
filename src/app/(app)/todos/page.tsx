"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { TodoRow } from "@/components/TodoRow";
import { TodoFormModal } from "@/components/TodoFormModal";
import { useUsers } from "@/lib/useUsers";
import { useAuth } from "@/components/AuthContext";
import type { RessortSummary, Todo } from "@/lib/uiTypes";

// Sonderwerte für die Filter-Dropdowns.
const ALL = "all";
const NONE = "none"; // ohne Ressort / niemandem zugewiesen
const ME = "me";

export default function AlleTodosPage() {
  const { user } = useAuth();
  const users = useUsers();
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [ressorts, setRessorts] = useState<{ id: number; name: string; farbe: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [ressortFilter, setRessortFilter] = useState<string>(ALL);
  const [personFilter, setPersonFilter] = useState<string>(ALL);

  const load = () => api.get<{ todos: Todo[] }>("/todos").then((d) => setTodos(d.todos));

  useEffect(() => {
    load();
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts")
      .then((d) => setRessorts(d.ressorts.map((r) => ({ id: r.id, name: r.name, farbe: r.farbe }))))
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    let list = todos ?? [];
    if (ressortFilter === NONE) list = list.filter((t) => !t.ressortId);
    else if (ressortFilter !== ALL) list = list.filter((t) => t.ressortId === Number(ressortFilter));

    if (personFilter === NONE) list = list.filter((t) => (t.assignees ?? []).length === 0);
    else if (personFilter === ME) list = list.filter((t) => (t.assignees ?? []).some((a) => a.id === user?.id));
    else if (personFilter !== ALL) list = list.filter((t) => (t.assignees ?? []).some((a) => a.id === Number(personFilter)));
    return list;
  }, [todos, ressortFilter, personFilter, user?.id]);

  const open = filtered.filter((t) => t.status !== "erledigt");
  const done = filtered.filter((t) => t.status === "erledigt");
  const filtersActive = ressortFilter !== ALL || personFilter !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Alle Todos</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {open.length > 0 ? `${open.length} offen${filtersActive ? " (gefiltert)" : " – ressortübergreifend"}` : "Ressortübergreifende Aufgaben"}
          </p>
        </div>
        <button className="btn-primary shrink-0 px-3 py-2 text-sm" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={16} /> Todo
        </button>
      </div>

      {/* Filter: Ressort & Zuständigkeit */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 basis-40">
          <select
            className="input appearance-none py-2 pr-8 text-sm"
            value={ressortFilter}
            onChange={(e) => setRessortFilter(e.target.value)}
            aria-label="Nach Ressort filtern"
          >
            <option value={ALL}>Alle Ressorts</option>
            <option value={NONE}>Ohne Ressort</option>
            {ressorts.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
          <Icon name="chevron" size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-stone-400" />
        </div>
        <div className="relative flex-1 basis-40">
          <select
            className="input appearance-none py-2 pr-8 text-sm"
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            aria-label="Nach Zuständigkeit filtern"
          >
            <option value={ALL}>Alle Zuständigen</option>
            <option value={ME}>Mir zugewiesen</option>
            <option value={NONE}>Niemandem zugewiesen</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </select>
          <Icon name="chevron" size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-stone-400" />
        </div>
        {filtersActive && (
          <button
            className="btn-ghost shrink-0 px-3 py-2 text-sm"
            onClick={() => {
              setRessortFilter(ALL);
              setPersonFilter(ALL);
            }}
          >
            <Icon name="close" size={15} /> Zurücksetzen
          </button>
        )}
      </div>

      {todos === null ? (
        <Spinner label="Lade Todos …" />
      ) : todos.length === 0 ? (
        <EmptyState title="Noch keine Todos" hint="Lege oben mit „+ Todo“ die erste Aufgabe an." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nichts gefunden" hint="Für diesen Filter gibt es keine Todos." />
      ) : (
        <div className="space-y-4">
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {open.length === 0 ? (
              <p className="px-4 py-3 text-sm text-stone-400">Alles erledigt. 🎉</p>
            ) : (
              open.map((t) => <AllTodoRow key={t.id} todo={t} onChanged={load} />)
            )}
          </div>

          {done.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-sm font-semibold text-stone-500">Erledigt ({done.length})</h3>
              <div className="card divide-y divide-slate-100 overflow-hidden opacity-70">
                {done.map((t) => (
                  <AllTodoRow key={t.id} todo={t} onChanged={load} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {createOpen && (
        <TodoFormModal
          open
          onClose={() => setCreateOpen(false)}
          ressortOptions={ressorts}
          subRessorts={[]}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AllTodoRow({ todo, onChanged }: { todo: Todo; onChanged: () => void }) {
  const name = todo.ressortName ?? todo.ressort?.name;
  const farbe = todo.ressortFarbe ?? todo.ressort?.farbe ?? "#94a3b8";
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 pt-2 text-xs font-medium" style={{ color: name ? farbe : "#94a3b8" }}>
        <span className="h-2 w-2 rounded-full" style={{ background: name ? farbe : "#cbd5e1" }} />
        {name ?? "Ohne Ressort"}
      </div>
      <TodoRow todo={{ ...todo, assignees: todo.assignees ?? [] }} detail onChanged={onChanged} onDeleted={onChanged} />
    </div>
  );
}
