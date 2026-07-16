"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import { Modal, Spinner } from "./Ui";
import type { ScheduleEntry, ScheduleFloor } from "@/lib/uiTypes";

// Zeitachse: 16:00 (min 0) bis 08:00 des Folgetags (min 960), vertikal nach unten.
const START_HOUR = 16;
const SPAN = 960;
const STEP = 15;
const PX_PER_MIN = 1.5; // 960 min → 1440 px
const TIME_W = 50;
const COL_W = 128;
const HEADER_H = 44;

const pad = (n: number) => String(n).padStart(2, "0");
function minToLabel(min: number): string {
  const total = START_HOUR * 60 + min;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}
const TIME_OPTIONS = Array.from({ length: SPAN / STEP + 1 }, (_, i) => i * STEP);
const HOURS = Array.from({ length: SPAN / 60 + 1 }, (_, i) => i * 60);

export function Zeitplan({ ressortId }: { ressortId: number }) {
  const [floors, setFloors] = useState<ScheduleFloor[] | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [actModal, setActModal] = useState<ScheduleEntry | "new" | null>(null);
  const [floorModal, setFloorModal] = useState(false);
  const [deleteFloor, setDeleteFloor] = useState<ScheduleFloor | null>(null);

  const load = () =>
    api.get<{ floors: ScheduleFloor[]; entries: ScheduleEntry[] }>(`/ressorts/${ressortId}/schedule`).then((d) => {
      setFloors(d.floors);
      setEntries(d.entries);
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  // Anzuzeigende Spalten: definierte Floors + evtl. verwaiste Act-Floors (grau).
  const displayFloors = useMemo(() => {
    const list: { name: string; farbe: string; id: number | null }[] = (floors ?? []).map((f) => ({
      name: f.name,
      farbe: f.farbe,
      id: f.id,
    }));
    const known = new Set(list.map((f) => f.name));
    for (const e of entries) {
      const fname = e.floor || "Ohne Ort";
      if (!known.has(fname)) {
        known.add(fname);
        list.push({ name: fname, farbe: "#94a3b8", id: null });
      }
    }
    return list;
  }, [floors, entries]);

  if (floors === null) return <Spinner label="Lade Zeitplan …" />;

  const colIndex = (name: string) => displayFloors.findIndex((f) => f.name === (name || "Ohne Ort"));
  const gridW = displayFloors.length * COL_W;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Zeitplan</h2>
          <p className="text-xs text-slate-500">16:00 – 08:00 · nach unten scrollen</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost px-3 py-2 text-sm" onClick={() => setFloorModal(true)}>
            + Ort
          </button>
          <button className="btn-primary px-3 py-2 text-sm" onClick={() => setActModal("new")}>
            + Act
          </button>
        </div>
      </div>

      {displayFloors.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          Noch keine Orte. Leg zuerst einen Ort an (z.&nbsp;B. &bdquo;Club&ldquo;), dann Acts.
        </div>
      ) : (
        <div className="card overflow-auto" style={{ maxHeight: "72vh" }}>
          <div style={{ width: TIME_W + gridW, position: "relative" }}>
            {/* Kopfzeile mit Floors (sticky oben) */}
            <div className="sticky top-0 z-20 flex" style={{ height: HEADER_H }}>
              <div className="sticky left-0 z-30 shrink-0 border-b border-r border-slate-200 bg-white" style={{ width: TIME_W }} />
              {displayFloors.map((f) => (
                <div
                  key={f.name}
                  className="flex shrink-0 items-center justify-between gap-1 border-b border-l border-slate-200 bg-white px-2"
                  style={{ width: COL_W }}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.farbe }} />
                    <span className="truncate text-xs font-semibold" style={{ color: f.farbe }}>
                      {f.name}
                    </span>
                  </span>
                  {f.id !== null && (
                    <button
                      className="shrink-0 rounded p-0.5 text-slate-300 hover:text-rose-500"
                      onClick={() => setDeleteFloor(floors.find((x) => x.id === f.id) ?? null)}
                      aria-label="Ort löschen"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Körper: Zeit-Gutter + Spalten */}
            <div className="flex" style={{ height: SPAN * PX_PER_MIN }}>
              <div className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white" style={{ width: TIME_W }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute right-1 text-[10px] font-medium text-slate-400" style={{ top: h * PX_PER_MIN - 6 }}>
                    {minToLabel(h)}
                  </div>
                ))}
              </div>
              <div className="relative" style={{ width: gridW }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: h * PX_PER_MIN }} />
                ))}
                {displayFloors.map((_, i) => (
                  <div key={i} className="absolute bottom-0 top-0 border-l border-slate-100" style={{ left: i * COL_W }} />
                ))}
                {entries.map((e) => {
                  const col = colIndex(e.floor);
                  if (col < 0) return null;
                  const color = displayFloors[col].farbe;
                  const h = (e.endMin - e.startMin) * PX_PER_MIN;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setActModal(e)}
                      className="absolute overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm active:scale-[0.99]"
                      style={{
                        left: col * COL_W + 3,
                        width: COL_W - 6,
                        top: e.startMin * PX_PER_MIN + 1,
                        height: Math.max(20, h - 2),
                        background: color,
                      }}
                      title={`${e.titel} · ${minToLabel(e.startMin)}–${minToLabel(e.endMin)}`}
                    >
                      <span className="block truncate text-xs font-semibold leading-tight">{e.titel}</span>
                      {h > 30 && (
                        <span className="block truncate text-[10px] leading-tight opacity-90">
                          {minToLabel(e.startMin)}–{minToLabel(e.endMin)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {actModal && (
        <ActModal
          ressortId={ressortId}
          entry={actModal === "new" ? null : actModal}
          floors={displayFloors.map((f) => f.name)}
          onClose={() => setActModal(null)}
          onSaved={() => {
            setActModal(null);
            load();
          }}
        />
      )}
      {floorModal && (
        <FloorModal
          ressortId={ressortId}
          onClose={() => setFloorModal(false)}
          onSaved={() => {
            setFloorModal(false);
            load();
          }}
        />
      )}
      {deleteFloor && (
        <Modal
          open
          onClose={() => setDeleteFloor(null)}
          title={`Ort „${deleteFloor.name}" löschen?`}
          footer={
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setDeleteFloor(null)}>
                Abbrechen
              </button>
              <button
                className="btn-danger flex-1"
                onClick={async () => {
                  await api.del(`/ressorts/${ressortId}/schedule/floors/${deleteFloor.id}`);
                  setDeleteFloor(null);
                  load();
                }}
              >
                Löschen
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">Alle Acts auf diesem Ort werden ebenfalls entfernt.</p>
        </Modal>
      )}
    </div>
  );
}

function FloorModal({ ressortId, onClose, onSaved }: { ressortId: number; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.post(`/ressorts/${ressortId}/schedule/floors`, { name: name.trim() });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Ort / Floor hinzufügen"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            Hinzufügen
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="z. B. Pyramide, Treppenhaus" />
        <p className="text-xs text-slate-400">Farbe wird automatisch vergeben.</p>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

function ActModal({
  ressortId,
  entry,
  floors,
  onClose,
  onSaved,
}: {
  ressortId: number;
  entry: ScheduleEntry | null;
  floors: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!entry;
  const [floor, setFloor] = useState(entry?.floor ?? floors[0] ?? "");
  const [titel, setTitel] = useState(entry?.titel ?? "");
  const [startMin, setStartMin] = useState(entry?.startMin ?? 4 * 60); // 20:00
  const [endMin, setEndMin] = useState(entry?.endMin ?? 5 * 60); // 21:00
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!floor) return setError("Bitte zuerst einen Ort anlegen");
    if (!titel.trim()) return setError("Act/Name erforderlich");
    if (endMin <= startMin) return setError("Ende muss nach Start liegen");
    setSaving(true);
    setError("");
    const payload = { floor, titel: titel.trim(), startMin, endMin };
    try {
      if (editing) await api.patch(`/ressorts/${ressortId}/schedule/${entry!.id}`, payload);
      else await api.post(`/ressorts/${ressortId}/schedule`, payload);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/ressorts/${ressortId}/schedule/${entry!.id}`);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Act bearbeiten" : "Neuer Act"}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={remove}>
              🗑️
            </button>
          )}
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            Speichern
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Ort / Floor</label>
          <select className="input" value={floor} onChange={(e) => setFloor(e.target.value)}>
            {floors.length === 0 && <option value="">— zuerst Ort anlegen —</option>}
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Act / DJ / Band</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="Name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Von</label>
            <select className="input" value={startMin} onChange={(e) => setStartMin(Number(e.target.value))}>
              {TIME_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {minToLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Bis</label>
            <select className="input" value={endMin} onChange={(e) => setEndMin(Number(e.target.value))}>
              {TIME_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {minToLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
