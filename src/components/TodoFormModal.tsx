"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import { Modal } from "./Ui";
import { AssigneePicker } from "./AssigneePicker";
import type { SubRessort, Todo, TodoStatus } from "@/lib/uiTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  ressortId: number;
  subRessorts: SubRessort[];
  todo?: Todo | null;
  defaultSubRessortId?: number | null;
  onSaved: (todo: Todo) => void;
}

const STATUS: TodoStatus[] = ["offen", "in_arbeit", "erledigt"];
const STATUS_LABEL: Record<TodoStatus, string> = { offen: "Offen", in_arbeit: "In Arbeit", erledigt: "Erledigt" };

export function TodoFormModal({ open, onClose, ressortId, subRessorts, todo, defaultSubRessortId, onSaved }: Props) {
  const editing = !!todo;
  const [titel, setTitel] = useState(todo?.titel ?? "");
  const [beschreibung, setBeschreibung] = useState(todo?.beschreibung ?? "");
  const [status, setStatus] = useState<TodoStatus>(todo?.status ?? "offen");
  const [fristDatum, setFristDatum] = useState(todo?.fristDatum ?? "");
  const [subRessortId, setSubRessortId] = useState<number | null>(todo?.subRessortId ?? defaultSubRessortId ?? null);
  const [assigneeIds, setAssigneeIds] = useState<number[]>(todo?.assignees.map((a) => a.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!titel.trim()) {
      setError("Titel erforderlich");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { ressortId, titel: titel.trim(), beschreibung, status, fristDatum: fristDatum || null, subRessortId, assigneeIds };
    try {
      const res = editing
        ? await api.patch<{ todo: Todo }>(`/todos/${todo!.id}`, payload)
        : await api.post<{ todo: Todo }>("/todos", payload);
      window.dispatchEvent(new Event("hausfest:refresh-inbox"));
      onSaved(res.todo);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Todo bearbeiten" : "Neues Todo"}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Speichern …" : "Speichern"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Titel</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="Was ist zu tun?" />
        </div>
        <div>
          <label className="label">Beschreibung</label>
          <textarea className="input min-h-[80px] resize-y" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Frist</label>
            <input type="date" className="input" value={fristDatum ?? ""} onChange={(e) => setFristDatum(e.target.value)} />
          </div>
        </div>
        {subRessorts.length > 0 && (
          <div>
            <label className="label">Sub-Ressort</label>
            <select
              className="input"
              value={subRessortId ?? ""}
              onChange={(e) => setSubRessortId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— keines —</option>
              {subRessorts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Zuständig</label>
          <AssigneePicker selected={assigneeIds} onChange={setAssigneeIds} />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
