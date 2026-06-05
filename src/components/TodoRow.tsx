"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { AvatarStack } from "./Ui";
import { STATUS_CLASSES, STATUS_LABEL, formatDate, isOverdue } from "@/lib/uiUtil";
import type { Todo, TodoStatus } from "@/lib/uiTypes";

const NEXT: Record<TodoStatus, TodoStatus> = {
  offen: "in_arbeit",
  in_arbeit: "erledigt",
  erledigt: "offen",
};

export function TodoRow({ todo, onChanged }: { todo: Todo; onChanged?: (t: Todo) => void }) {
  const [status, setStatus] = useState<TodoStatus>(todo.status);
  const [busy, setBusy] = useState(false);

  const update = async (next: TodoStatus) => {
    if (busy) return;
    setBusy(true);
    const prev = status;
    setStatus(next);
    try {
      const { todo: updated } = await api.patch<{ todo: Todo }>(`/todos/${todo.id}`, { status: next });
      onChanged?.(updated);
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    update(status === "erledigt" ? "offen" : "erledigt");
  };
  const cycleStatus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    update(NEXT[status]);
  };

  const done = status === "erledigt";
  const overdue = isOverdue(todo.fristDatum, status);

  return (
    <Link href={`/todo/${todo.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-slate-50">
      <button
        onClick={toggleDone}
        aria-label="Erledigt umschalten"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"
        }`}
      >
        ✓
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {todo.titel}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          <button onClick={cycleStatus} className={`chip ${STATUS_CLASSES[status]}`}>
            {STATUS_LABEL[status]}
          </button>
          {todo.fristDatum && (
            <span className={`chip ${overdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
              📅 {formatDate(todo.fristDatum)}
            </span>
          )}
          {!!todo.commentCount && <span className="text-slate-400">💬 {todo.commentCount}</span>}
        </div>
      </div>

      <AvatarStack users={todo.assignees ?? []} size={24} />
    </Link>
  );
}
