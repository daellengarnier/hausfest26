"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { AvatarStack, Modal } from "./Ui";
import { Icon } from "./Icon";
import { formatDate, isOverdue } from "@/lib/uiUtil";
import type { Todo, TodoStatus } from "@/lib/uiTypes";

export function TodoRow({
  todo,
  onChanged,
  onDeleted,
  detail = false,
}: {
  todo: Todo;
  onChanged?: (t: Todo) => void;
  onDeleted?: () => void;
  detail?: boolean;
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
      <Link href={`/todo/${todo.id}`} className={`flex gap-3 px-3 py-2.5 active:bg-slate-50 ${detail ? "items-start" : "items-center"}`}>
        <button
          onClick={toggleDone}
          aria-label="Erledigt umschalten"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${detail ? "mt-0.5" : ""} ${
            done ? "border-accent bg-accent text-white" : "border-stone-300 text-transparent"
          }`}
        >
          <Icon name="check" size={13} strokeWidth={2.4} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${detail ? "" : "truncate"} ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
            {todo.titel}
          </p>
          {detail && todo.beschreibung && (
            <p className={`mt-0.5 whitespace-pre-wrap text-xs ${done ? "text-slate-400" : "text-stone-500"}`}>{todo.beschreibung}</p>
          )}
          {(todo.fristDatum || !!todo.commentCount) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
              {todo.fristDatum && (
                <span className={`chip ${overdue ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-500"}`}>
                  <Icon name="calendar" size={12} /> {formatDate(todo.fristDatum)}
                </span>
              )}
              {!!todo.commentCount && (
                <span className="inline-flex items-center gap-1 text-stone-400">
                  <Icon name="chat" size={13} /> {todo.commentCount}
                </span>
              )}
            </div>
          )}
        </div>

        <AvatarStack users={todo.assignees ?? []} size={24} />
        <button
          onClick={askDelete}
          aria-label="Todo löschen"
          className="shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-600"
        >
          <Icon name="trash" size={17} />
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
