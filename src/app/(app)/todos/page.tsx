"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { TodoRow } from "@/components/TodoRow";
import { TodoFormModal } from "@/components/TodoFormModal";
import type { RessortSummary, Todo } from "@/lib/uiTypes";

export default function AlleTodosPage() {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [ressorts, setRessorts] = useState<{ id: number; name: string; farbe: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => api.get<{ todos: Todo[] }>("/todos").then((d) => setTodos(d.todos));

  useEffect(() => {
    load();
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts")
      .then((d) => setRessorts(d.ressorts.map((r) => ({ id: r.id, name: r.name, farbe: r.farbe }))))
      .catch(() => undefined);
  }, []);

  const open = (todos ?? []).filter((t) => t.status !== "erledigt");
  const done = (todos ?? []).filter((t) => t.status === "erledigt");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Alle Todos</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {open.length > 0 ? `${open.length} offen – ressortübergreifend` : "Ressortübergreifende Aufgaben"}
          </p>
        </div>
        <button className="btn-primary shrink-0 px-3 py-2 text-sm" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={16} /> Todo
        </button>
      </div>

      {todos === null ? (
        <Spinner label="Lade Todos …" />
      ) : todos.length === 0 ? (
        <EmptyState title="Noch keine Todos" hint="Lege oben mit „+ Todo“ die erste Aufgabe an." />
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
