"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import { Modal, Spinner, EmptyState } from "./Ui";
import type { ScheduleEntry } from "@/lib/uiTypes";

// Zeitachse: 16:00 (min 0) bis 08:00 des Folgetags (min 960).
const START_HOUR = 16;
const SPAN = 960;
const STEP = 15;
const PX_PER_MIN = 2.6;
const LABEL_W = 96;
const ROW_H = 46;

const pad = (n: number) => String(n).padStart(2, "0");
function minToLabel(min: number): string {
  const total = START_HOUR * 60 + min;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}
const TIME_OPTIONS = Array.from({ length: SPAN / STEP + 1 }, (_, i) => i * STEP);

const FLOOR_COLORS = ["#ec4899", "#6366f1", "#06b6d4", "#22c55e", "#f97316", "#8b5cf6", "#eab308", "#ef4444"];
function floorColor(floor: string, floors: string[]): string {
  const idx = Math.max(0, floors.indexOf(floor));
  return FLOOR_COLORS[idx % FLOOR_COLORS.length];
}

// Ordnet Einträge eines Floors überschneidungsfrei in „Lanes" (Zeilen) an.
function packLanes(entries: ScheduleEntry[]): { entry: ScheduleEntry; lane: number }[] {
  const laneEnds: number[] = [];
  const sorted = [...entries].sort((a, b) => a.startMin - b.startMin);
  return sorted.map((entry) => {
    let lane = laneEnds.findIndex((end) => end <= entry.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.endMin);
    } else {
      laneEnds[lane] = entry.endMin;
    }
    return { entry, lane };
  });
}

export function Zeitplan({ ressortId }: { ressortId: number }) {
  const [entries, setEntries] = useState<ScheduleEntry[] | null>(null);
  const [editing, setEditing] = useState<ScheduleEntry | "new" | null>(null);

  const load = () =>
    api.get<{ entries: ScheduleEntry[] }>(`/ressorts/${ressortId}/schedule`).then((d) => setEntries(d.entries));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  const floors = useMemo(() => {
    if (!entries) return [];
    const byFloor = new Map<string, number>();
    for (const e of entries) {
      const f = e.floor || "Ohne Floor";
      if (!byFloor.has(f) || e.startMin < byFloor.get(f)!) byFloor.set(f, e.startMin);
    }
    return [...byFloor.entries()].sort((a, b) => a[1] - b[1]).map(([f]) => f);
  }, [entries]);

  if (entries === null) return <Spinner label="Lade Zeitplan …" />;

  const hours = Array.from({ length: SPAN / 60 + 1 }, (_, i) => i * 60);
  const totalW = LABEL_W + SPAN * PX_PER_MIN;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Zeitplan</h2>
          <p className="text-xs text-slate-500">16:00 – 08:00, pro Floor eine Zeile</p>
        </div>
        <button className="btn-primary px-3 py-2 text-sm" onClick={() => setEditing("new")}>
          + Act
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="🎶"
          title="Noch kein Programm"
          hint="Leg den ersten Act an – Floor, Name und Uhrzeit. Danach erscheint hier die Timeline."
          action={
            <button className="btn-primary" onClick={() => setEditing("new")}>
              + Ersten Act anlegen
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <div style={{ width: totalW, minWidth: "100%" }}>
            {/* Stundenkopf */}
            <div className="flex border-b border-slate-200">
              <div className="sticky left-0 z-10 shrink-0 bg-white" style={{ width: LABEL_W }} />
              <div className="relative" style={{ width: SPAN * PX_PER_MIN, height: 28 }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 h-full border-l border-slate-100 pl-1 text-[11px] text-slate-400"
                    style={{ left: h * PX_PER_MIN }}
                  >
                    {minToLabel(h)}
                  </div>
                ))}
              </div>
            </div>

            {/* Floor-Zeilen */}
            {floors.map((floor) => {
              const packed = packLanes(entries.filter((e) => (e.floor || "Ohne Floor") === floor));
              const lanes = Math.max(1, ...packed.map((p) => p.lane + 1));
              const color = floorColor(floor, floors);
              return (
                <div key={floor} className="flex border-b border-slate-100 last:border-0">
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-white px-2 text-xs font-medium"
                    style={{ width: LABEL_W }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="truncate">{floor}</span>
                  </div>
                  <div className="relative" style={{ width: SPAN * PX_PER_MIN, height: lanes * ROW_H + 8 }}>
                    {/* Stunden-Gitter */}
                    {hours.map((h) => (
                      <div key={h} className="absolute top-0 h-full border-l border-slate-100" style={{ left: h * PX_PER_MIN }} />
                    ))}
                    {packed.map(({ entry, lane }) => (
                      <button
                        key={entry.id}
                        onClick={() => setEditing(entry)}
                        className="absolute overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm active:scale-[0.99]"
                        style={{
                          left: entry.startMin * PX_PER_MIN + 2,
                          width: Math.max(28, (entry.endMin - entry.startMin) * PX_PER_MIN - 4),
                          top: lane * ROW_H + 4,
                          height: ROW_H - 8,
                          background: color,
                        }}
                        title={`${entry.titel} · ${minToLabel(entry.startMin)}–${minToLabel(entry.endMin)}`}
                      >
                        <span className="block truncate text-xs font-semibold leading-tight">{entry.titel}</span>
                        <span className="block truncate text-[10px] leading-tight opacity-90">
                          {minToLabel(entry.startMin)}–{minToLabel(entry.endMin)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <ActModal
          ressortId={ressortId}
          entry={editing === "new" ? null : editing}
          floors={floors}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
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
  const [startMin, setStartMin] = useState(entry?.startMin ?? 4 * 60); // Default 20:00
  const [endMin, setEndMin] = useState(entry?.endMin ?? 5 * 60); // 21:00
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!titel.trim()) return setError("Act/Name erforderlich");
    if (endMin <= startMin) return setError("Ende muss nach Start liegen");
    setSaving(true);
    setError("");
    const payload = { floor: floor.trim(), titel: titel.trim(), startMin, endMin };
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
          <label className="label">Floor / Bühne</label>
          <input
            className="input"
            list="floor-suggestions"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="z. B. Club, Alternativfloor, Garten"
          />
          <datalist id="floor-suggestions">
            {floors.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
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
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
