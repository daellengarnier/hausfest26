"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { AvatarStack, Modal } from "./Ui";
import { STATUS_CLASSES, STATUS_LABEL, formatDate, isOverdue } from "@/lib/uiUtil";
import type { Todo, TodoStatus } from "@/lib/uiTypes";

const NEXT: Record<TodoStatus, TodoStatus> = {
  offen: "in_arbeit",
  in_arbeit: "erledigt",
  erledigt: "offen",
};

export function TodoRow({
  todo,
  onChanged,
  onDeleted,
}: {
  todo: Todo;
  onChanged?: (t: Todo) => void;
  onDeleted?: () => void;
}) {
  const [status, setStatus] = useState<TodoStatus>(todo.status);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

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
  const askDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDel(true);
  };
  const remove = async () => {
    await api.del(`/todos/${todo.id}`);
    setConfirmDel(false);
    onDeleted?.();
  };

  const done = status === "erledigt";
  const overdue = isOverdue(todo.fristDatum, status);

  return (
    <>
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
              <span className={`chip ${overdue ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                📅 {formatDate(todo.fristDatum)}
              </span>
            )}
            {!!todo.commentCount && <span className="text-slate-400">💬 {todo.commentCount}</span>}
          </div>
        </div>

        <AvatarStack users={todo.assignees ?? []} size={24} />
        <button
          onClick={askDelete}
          aria-label="Todo löschen"
          className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
        >
          🗑️
        </button>
      </Link>

      <Modal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Todo löschen?"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setConfirmDel(false)}>
              Abbrechen
            </button>
            <button className="btn-danger flex-1" onClick={remove}>
              Löschen
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          &bdquo;{todo.titel}&ldquo; wird mit Diskussion dauerhaft entfernt.
        </p>
      </Modal>
    </>
  );
}
