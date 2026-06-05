"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { AvatarStack, Modal, Spinner } from "@/components/Ui";
import { CommentThread } from "@/components/CommentThread";
import { TodoFormModal } from "@/components/TodoFormModal";
import { STATUS_CLASSES, STATUS_LABEL, formatDateLong, isOverdue } from "@/lib/uiUtil";
import type { SubRessort, Todo, TodoStatus } from "@/lib/uiTypes";

const STATUS: TodoStatus[] = ["offen", "in_arbeit", "erledigt"];

export default function TodoPage() {
  const params = useParams<{ id: string }>();
  const todoId = Number(params.id);
  const router = useRouter();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [subRessorts, setSubRessorts] = useState<SubRessort[]>([]);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const load = () =>
    api
      .get<{ todo: Todo }>(`/todos/${todoId}`)
      .then(({ todo }) => {
        setTodo(todo);
        api
          .get<{ subRessorts: SubRessort[] }>(`/ressorts/${todo.ressortId}`)
          .then((d) => setSubRessorts(d.subRessorts))
          .catch(() => undefined);
      })
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    setTodo(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todoId]);

  const setStatus = async (status: TodoStatus) => {
    if (!todo) return;
    setTodo({ ...todo, status });
    const { todo: updated } = await api.patch<{ todo: Todo }>(`/todos/${todoId}`, { status });
    setTodo(updated);
  };

  const remove = async () => {
    await api.del(`/todos/${todoId}`);
    router.back();
  };

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!todo) return <Spinner label="Lade Todo …" />;

  const overdue = isOverdue(todo.fristDatum, todo.status);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        {todo.ressort && (
          <Link href={`/ressort/${todo.ressort.id}`} className="inline-flex items-center gap-1 text-sm" style={{ color: todo.ressort.farbe }}>
            ← {todo.ressort.name}
            {todo.subRessort && <span className="text-slate-400"> / {todo.subRessort.name}</span>}
          </Link>
        )}
        <h1 className="mt-1 text-xl font-bold">{todo.titel}</h1>
        {todo.beschreibung && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{todo.beschreibung}</p>}

        <div className="mt-4">
          <p className="label">Status</p>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {STATUS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  todo.status === s ? STATUS_CLASSES[s] + " shadow-sm" : "text-slate-500"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="label">Zuständig</p>
            {todo.assignees.length === 0 ? (
              <span className="text-slate-400">niemand</span>
            ) : (
              <div className="flex items-center gap-2">
                <AvatarStack users={todo.assignees} />
                <span className="text-slate-600">{todo.assignees.map((a) => a.name).join(", ")}</span>
              </div>
            )}
          </div>
          <div>
            <p className="label">Frist</p>
            <span className={overdue ? "font-medium text-red-600" : "text-slate-600"}>
              {todo.fristDatum ? formatDateLong(todo.fristDatum) : "keine"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setEditOpen(true)}>
            ✏️ Bearbeiten
          </button>
          <button className="btn-danger" onClick={() => setConfirmDel(true)}>
            🗑️
          </button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Diskussion</h2>
        <CommentThread parentTyp="todo" parentId={todoId} />
      </div>

      <TodoFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        ressortId={todo.ressortId}
        subRessorts={subRessorts}
        todo={todo}
        onSaved={(t) => setTodo({ ...todo, ...t })}
      />

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
        <p className="text-sm text-slate-600">&bdquo;{todo.titel}&ldquo; und die zugehörige Diskussion werden dauerhaft entfernt.</p>
      </Modal>
    </div>
  );
}
