"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Modal, Spinner } from "@/components/Ui";
import { TodoRow } from "@/components/TodoRow";
import { TodoFormModal } from "@/components/TodoFormModal";
import { CommentThread } from "@/components/CommentThread";
import { relTime } from "@/lib/uiUtil";
import type { ProtocolRef, Ressort, SubRessort, Todo } from "@/lib/uiTypes";

interface DetailResponse {
  ressort: Ressort;
  subRessorts: SubRessort[];
  todos: Todo[];
  protocols: ProtocolRef[];
}

export default function RessortPage() {
  const params = useParams<{ id: string }>();
  const ressortId = Number(params.id);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [tab, setTab] = useState<"todos" | "pinnwand">("todos");
  const [error, setError] = useState("");
  const [todoModal, setTodoModal] = useState<{ open: boolean; subId: number | null }>({ open: false, subId: null });
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const load = useCallback(() => {
    api.get<DetailResponse>(`/ressorts/${ressortId}`).then(setData).catch((e) => setError((e as Error).message));
  }, [ressortId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner label="Lade Ressort …" />;

  const { ressort, subRessorts, todos, protocols } = data;
  const todosWithoutSub = todos.filter((t) => !t.subRessortId);
  const todosBySub = (subId: number) => todos.filter((t) => t.subRessortId === subId);
  const openTodoCount = todos.filter((t) => t.status !== "erledigt").length;

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-4" style={{ borderTop: `5px solid ${ressort.farbe}` }}>
        <Link href="/" className="text-sm text-slate-400">
          ← Übersicht
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{ressort.name}</h1>
        {ressort.beschreibung && <p className="mt-1 text-sm text-slate-500">{ressort.beschreibung}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Lead{ressort.leads.length !== 1 ? "s" : ""}:</span>
          {ressort.leads.length === 0 && <span className="text-xs text-slate-400">—</span>}
          {ressort.leads.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2.5 text-sm">
              <Avatar name={u.name} color={u.avatarColor} size={22} />
              {u.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 text-sm font-medium">
        <button className={`flex-1 rounded-lg py-2 ${tab === "todos" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("todos")}>
          Todos {openTodoCount > 0 && <span className="text-slate-400">({openTodoCount})</span>}
        </button>
        <button className={`flex-1 rounded-lg py-2 ${tab === "pinnwand" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("pinnwand")}>
          Pinnwand
        </button>
      </div>

      {tab === "todos" ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => setTodoModal({ open: true, subId: null })}>
              + Todo
            </button>
            <button className="btn-ghost" onClick={() => setSubModalOpen(true)}>
              + Sub-Ressort
            </button>
          </div>

          {(todosWithoutSub.length > 0 || subRessorts.length === 0) && (
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {todosWithoutSub.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon="🌱" title="Noch keine Todos" hint="Leg das erste an." />
                </div>
              ) : (
                todosWithoutSub.map((t) => <TodoRow key={t.id} todo={t} onChanged={load} />)
              )}
            </div>
          )}

          {subRessorts.map((sub) => {
            const subTodos = todosBySub(sub.id);
            const isCollapsed = collapsed[sub.id];
            const open = subTodos.filter((t) => t.status !== "erledigt").length;
            return (
              <div key={sub.id} className="card overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setCollapsed((c) => ({ ...c, [sub.id]: !c[sub.id] }))}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-slate-400">{isCollapsed ? "▸" : "▾"}</span>
                    {sub.name}
                  </span>
                  <span className="chip bg-slate-100 text-slate-500">{open} offen</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {subTodos.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">Noch keine Todos in diesem Sub-Ressort.</p>
                    ) : (
                      subTodos.map((t) => <TodoRow key={t.id} todo={t} onChanged={load} />)
                    )}
                    <button
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-accent hover:bg-slate-50"
                      onClick={() => setTodoModal({ open: true, subId: sub.id })}
                    >
                      + Todo hier
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {protocols.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-sm font-semibold text-slate-500">Protokolle</h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {protocols.map((p) => (
                  <Link key={p.id} href={`/meetings/${p.meetingId}`} className="flex items-center justify-between px-4 py-3 active:bg-slate-50">
                    <span className="flex items-center gap-2 text-sm">📝 {p.titel}</span>
                    <span className="text-xs text-slate-400">{relTime(p.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4">
          <CommentThread parentTyp="ressort" parentId={ressortId} />
        </div>
      )}

      <TodoFormModal
        open={todoModal.open}
        onClose={() => setTodoModal({ open: false, subId: null })}
        ressortId={ressortId}
        subRessorts={subRessorts}
        defaultSubRessortId={todoModal.subId}
        onSaved={load}
      />
      <SubRessortModal open={subModalOpen} onClose={() => setSubModalOpen(false)} ressortId={ressortId} onSaved={load} />
    </div>
  );
}

function SubRessortModal({
  open,
  onClose,
  ressortId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  ressortId: number;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/ressorts/${ressortId}/sub-ressorts`, { name: name.trim(), beschreibung });
      setName("");
      setBeschreibung("");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neues Sub-Ressort"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            Anlegen
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="z. B. Treppenhaus" />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <textarea className="input min-h-[70px] resize-y" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
