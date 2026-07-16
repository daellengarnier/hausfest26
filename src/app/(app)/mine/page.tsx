"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, MentionText, Spinner } from "@/components/Ui";
import { TodoRow } from "@/components/TodoRow";
import { relTime } from "@/lib/uiUtil";
import type { Todo } from "@/lib/uiTypes";

interface MentionRow {
  commentId: number;
  text: string;
  createdAt: string;
  parentTyp: "todo" | "ressort";
  parentId: number;
  autorName: string | null;
}

export default function MinePage() {
  const [assigned, setAssigned] = useState<Todo[] | null>(null);
  const [mentioned, setMentioned] = useState<MentionRow[]>([]);
  const [tab, setTab] = useState<"assigned" | "mentioned">("assigned");

  const load = () =>
    api.get<{ assigned: Todo[]; mentioned: MentionRow[] }>("/todos/mine").then((d) => {
      setAssigned(d.assigned);
      setMentioned(d.mentioned);
    });

  useEffect(() => {
    load();
  }, []);

  const openAssigned = (assigned ?? []).filter((t) => t.status !== "erledigt");
  const doneAssigned = (assigned ?? []).filter((t) => t.status === "erledigt");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-ink">Meine Sachen</h1>

      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 text-sm font-medium">
        <button className={`flex-1 rounded-lg py-2 ${tab === "assigned" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("assigned")}>
          Mir zugewiesen {openAssigned.length > 0 && <span className="text-slate-400">({openAssigned.length})</span>}
        </button>
        <button className={`flex-1 rounded-lg py-2 ${tab === "mentioned" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("mentioned")}>
          @mich erwähnt
        </button>
      </div>

      {assigned === null ? (
        <Spinner />
      ) : tab === "assigned" ? (
        openAssigned.length === 0 && doneAssigned.length === 0 ? (
          <EmptyState icon="🎉" title="Nichts zugewiesen" hint="Dir wurden noch keine Todos zugewiesen." />
        ) : (
          <div className="space-y-4">
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {openAssigned.length === 0 ? (
                <p className="px-4 py-3 text-sm text-stone-400">Alles erledigt.</p>
              ) : (
                openAssigned.map((t) => <TodoRowWithRessort key={t.id} todo={t} onChanged={load} />)
              )}
            </div>
            {doneAssigned.length > 0 && (
              <div>
                <h3 className="mb-2 px-1 text-sm font-semibold text-stone-500">Erledigt</h3>
                <div className="card divide-y divide-slate-100 overflow-hidden opacity-70">
                  {doneAssigned.map((t) => <TodoRowWithRessort key={t.id} todo={t} onChanged={load} />)}
                </div>
              </div>
            )}
          </div>
        )
      ) : mentioned.length === 0 ? (
        <EmptyState icon="📣" title="Keine Erwähnungen" hint="Hier erscheinen Kommentare, in denen du mit @Name erwähnt wurdest." />
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {mentioned.map((m) => (
            <Link
              key={m.commentId}
              href={m.parentTyp === "todo" ? `/todo/${m.parentId}` : `/ressort/${m.parentId}`}
              className="block px-4 py-3 active:bg-slate-50"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{m.autorName ?? "Jemand"}</span>
                <span className="text-xs text-slate-400">{relTime(m.createdAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                <MentionText text={m.text} />
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TodoRowWithRessort({ todo, onChanged }: { todo: Todo; onChanged: () => void }) {
  return (
    <div>
      {todo.ressortName && (
        <div className="flex items-center gap-1.5 px-3 pt-2 text-xs font-medium" style={{ color: todo.ressortFarbe ?? "#64748b" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: todo.ressortFarbe ?? "#64748b" }} />
          {todo.ressortName}
        </div>
      )}
      <TodoRow todo={{ ...todo, assignees: todo.assignees ?? [] }} onChanged={onChanged} onDeleted={onChanged} />
    </div>
  );
}
