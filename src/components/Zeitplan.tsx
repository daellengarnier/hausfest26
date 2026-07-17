"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { Modal, Spinner } from "./Ui";
import type { Attachment, BoardKind, ScheduleEntry, ScheduleFloor, ScheduleMarker } from "@/lib/uiTypes";
import { Icon } from "@/components/Icon";

// Zeitachse: 16:00 (min 0) bis 08:00 des Folgetags (min 960), vertikal nach unten.
const START_HOUR = 16;
const SPAN = 960;
const STEP = 15;
const PX_PER_MIN = 1.05; // kompakter: 960 min → ~1008 px
const TIME_W = 42;
const COL_W = 104;
const HEADER_H = 34;

const pad = (n: number) => String(n).padStart(2, "0");
function minToLabel(min: number): string {
  const total = START_HOUR * 60 + min;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}
const TIME_OPTIONS = Array.from({ length: SPAN / STEP + 1 }, (_, i) => i * STEP);
const HOURS = Array.from({ length: SPAN / 60 + 1 }, (_, i) => i * 60);

interface Labels {
  colHeader: string; // Spalten-Objekt
  addCol: string;
  addEntry: string;
  entryTitle: string; // Modal-Titel für Eintrag
  entryNameLabel: string;
  entryNameRequired: boolean;
  empty: string;
}
const LABELS: Record<"acts" | "bars", Labels> = {
  acts: {
    colHeader: "Ort / Floor",
    addCol: "+ Ort",
    addEntry: "+ Act",
    entryTitle: "Act",
    entryNameLabel: "Act / DJ / Band",
    entryNameRequired: true,
    empty: "Noch keine Orte. Leg zuerst einen Ort an, dann Acts.",
  },
  bars: {
    colHeader: "Bar",
    addCol: "+ Bar",
    addEntry: "+ Öffnungszeit",
    entryTitle: "Öffnungszeit",
    entryNameLabel: "Notiz (optional, z. B. Snacks)",
    entryNameRequired: false,
    empty: "Noch keine Bars. Leg zuerst eine Bar an, dann Öffnungszeiten.",
  },
};

export function Zeitplan({
  ressortId,
  board = "programm",
  mode = "acts",
}: {
  ressortId: number;
  board?: BoardKind;
  mode?: "acts" | "bars";
}) {
  const L = LABELS[mode];
  const [floors, setFloors] = useState<ScheduleFloor[] | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [markers, setMarkers] = useState<ScheduleMarker[]>([]);
  const [actModal, setActModal] = useState<ScheduleEntry | "new" | null>(null);
  const [floorModal, setFloorModal] = useState(false);
  const [markerModal, setMarkerModal] = useState<ScheduleMarker | "new" | null>(null);
  const [deleteFloor, setDeleteFloor] = useState<ScheduleFloor | null>(null);

  const load = () =>
    api
      .get<{ floors: ScheduleFloor[]; entries: ScheduleEntry[]; markers: ScheduleMarker[] }>(
        `/ressorts/${ressortId}/schedule?board=${board}`,
      )
      .then((d) => {
        setFloors(d.floors);
        setEntries(d.entries);
        setMarkers(d.markers ?? []);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId, board]);

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
      <div className="flex flex-wrap items-center gap-1.5">
        <h2 className="mr-auto font-semibold">{mode === "bars" ? "Öffnungszeiten" : "Line-up"}</h2>
        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setMarkerModal("new")}>
          + Zeitfenster
        </button>
        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setFloorModal(true)}>
          {L.addCol}
        </button>
        <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={() => setActModal("new")}>
          {L.addEntry}
        </button>
      </div>

      {displayFloors.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">{L.empty}</div>
      ) : (
        <div className="card overflow-auto" style={{ maxHeight: "80vh" }}>
          <div style={{ width: TIME_W + gridW, position: "relative" }}>
            {/* Kopfzeile (sticky oben) */}
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
                      aria-label="Löschen"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Körper */}
            <div className="flex" style={{ height: SPAN * PX_PER_MIN }}>
              <div className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white" style={{ width: TIME_W }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute right-1 text-[10px] font-medium text-slate-400" style={{ top: h * PX_PER_MIN - 6 }}>
                    {minToLabel(h)}
                  </div>
                ))}
              </div>
              <div className="relative" style={{ width: gridW }}>
                {/* Stundenlinien */}
                {HOURS.map((h) => (
                  <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ top: h * PX_PER_MIN }} />
                ))}
                {/* Spaltentrenner */}
                {displayFloors.map((_, i) => (
                  <div key={i} className="pointer-events-none absolute bottom-0 top-0 border-l border-slate-100" style={{ left: i * COL_W }} />
                ))}
                {/* Zeitfenster-Marker (dezent, volle Breite) */}
                {markers.map((m) => (
                  <button
                    key={`m${m.id}`}
                    onClick={() => setMarkerModal(m)}
                    className="absolute inset-x-0 z-0 overflow-hidden text-left"
                    style={{
                      top: m.startMin * PX_PER_MIN,
                      height: Math.max(14, (m.endMin - m.startMin) * PX_PER_MIN),
                      background: `${m.farbe}1f`,
                      borderTop: `1px dashed ${m.farbe}80`,
                      borderBottom: `1px dashed ${m.farbe}80`,
                    }}
                    title={`${m.titel} · ${minToLabel(m.startMin)}–${minToLabel(m.endMin)}`}
                  >
                    <span
                      className="sticky left-1 inline-block rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                      style={{ color: m.farbe }}
                    >
                      {m.titel} · {minToLabel(m.startMin)}–{minToLabel(m.endMin)}
                    </span>
                  </button>
                ))}
                {/* Einträge */}
                {entries.map((e) => {
                  const col = colIndex(e.floor);
                  if (col < 0) return null;
                  const color = displayFloors[col].farbe;
                  const h = (e.endMin - e.startMin) * PX_PER_MIN;
                  const timeStr = `${minToLabel(e.startMin)}–${minToLabel(e.endMin)}`;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setActModal(e)}
                      className="absolute z-10 overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm active:scale-[0.99]"
                      style={{
                        left: col * COL_W + 3,
                        width: COL_W - 6,
                        top: e.startMin * PX_PER_MIN + 1,
                        height: Math.max(20, h - 2),
                        background: color,
                      }}
                      title={`${e.titel || timeStr} · ${timeStr}`}
                    >
                      {(e.notiz || (e.files?.length ?? 0) > 0 || e.gageCents || e.anzahlLeute) && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/90" />
                      )}
                      {mode === "bars" ? (
                        <>
                          <span className="block truncate text-xs font-semibold leading-tight">{timeStr}</span>
                          {e.titel && h > 30 && <span className="block truncate text-[10px] leading-tight opacity-90">{e.titel}</span>}
                        </>
                      ) : (
                        <>
                          <span className="block truncate text-xs font-semibold leading-tight">{e.titel}</span>
                          {h > 30 && <span className="block truncate text-[10px] leading-tight opacity-90">{timeStr}</span>}
                        </>
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
        <EntryModal
          ressortId={ressortId}
          board={board}
          labels={L}
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
          board={board}
          labels={L}
          onClose={() => setFloorModal(false)}
          onSaved={() => {
            setFloorModal(false);
            load();
          }}
        />
      )}
      {markerModal && (
        <MarkerModal
          ressortId={ressortId}
          board={board}
          marker={markerModal === "new" ? null : markerModal}
          onClose={() => setMarkerModal(null)}
          onSaved={() => {
            setMarkerModal(null);
            load();
          }}
        />
      )}
      {deleteFloor && (
        <Modal
          open
          onClose={() => setDeleteFloor(null)}
          title={`„${deleteFloor.name}" löschen?`}
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
          <p className="text-sm text-slate-600">Alle zugehörigen Einträge werden ebenfalls entfernt.</p>
        </Modal>
      )}
    </div>
  );
}

function FloorModal({
  ressortId,
  board,
  labels,
  onClose,
  onSaved,
}: {
  ressortId: number;
  board: BoardKind;
  labels: Labels;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.post(`/ressorts/${ressortId}/schedule/floors`, { name: name.trim(), board });
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
      title={`${labels.colHeader} hinzufügen`}
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
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={board === "bars" ? "z. B. Bar Dreiecksbar" : "z. B. Pyramide"} />
        <p className="text-xs text-slate-400">Farbe wird automatisch vergeben.</p>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

function EntryModal({
  ressortId,
  board,
  labels,
  entry,
  floors,
  onClose,
  onSaved,
}: {
  ressortId: number;
  board: BoardKind;
  labels: Labels;
  entry: ScheduleEntry | null;
  floors: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!entry;
  const acts = board === "programm";
  const [floor, setFloor] = useState(entry?.floor ?? floors[0] ?? "");
  const [titel, setTitel] = useState(entry?.titel ?? "");
  const [startMin, setStartMin] = useState(entry?.startMin ?? (board === "bars" ? 0 : 4 * 60));
  const [endMin, setEndMin] = useState(entry?.endMin ?? (board === "bars" ? 6 * 60 : 5 * 60));
  const [notiz, setNotiz] = useState(entry?.notiz ?? "");
  const [anzahl, setAnzahl] = useState(entry?.anzahlLeute != null ? String(entry.anzahlLeute) : "");
  const [gage, setGage] = useState(entry?.gageCents != null ? (entry.gageCents / 100).toFixed(2) : "");
  const [files, setFiles] = useState<Attachment[]>(entry?.files ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/attachments", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload fehlgeschlagen");
      const { attachment } = (await res.json()) as { attachment: Attachment };
      setFiles((prev) => [...prev, attachment]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!floor) return setError("Bitte zuerst einen Eintrag/Ort anlegen");
    if (labels.entryNameRequired && !titel.trim()) return setError(`${labels.entryNameLabel} erforderlich`);
    if (endMin <= startMin) return setError("Ende muss nach Start liegen");
    setSaving(true);
    setError("");
    const gageNum = parseFloat(gage.replace(",", "."));
    const payload = {
      board,
      floor,
      titel: titel.trim(),
      startMin,
      endMin,
      notiz: notiz.trim(),
      anzahlLeute: anzahl.trim() ? Number(anzahl) : null,
      gageCents: Number.isFinite(gageNum) && gageNum > 0 ? Math.round(gageNum * 100) : null,
      fileIds: files.map((f) => f.id),
    };
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
      title={editing ? `${labels.entryTitle} bearbeiten` : `Neue:r ${labels.entryTitle}`}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={remove} aria-label="Löschen">
              <Icon name="trash" size={17} />
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
          <label className="label">{labels.colHeader}</label>
          <select className="input" value={floor} onChange={(e) => setFloor(e.target.value)}>
            {floors.length === 0 && <option value="">— zuerst anlegen —</option>}
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{labels.entryNameLabel}</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder={labels.entryNameRequired ? "Name" : "optional"} />
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

        {acts && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Anzahl Leute</label>
              <input className="input" inputMode="numeric" value={anzahl} onChange={(e) => setAnzahl(e.target.value)} placeholder="z. B. 3" />
            </div>
            <div>
              <label className="label">Gage (CHF)</label>
              <input className="input" inputMode="decimal" value={gage} onChange={(e) => setGage(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        )}

        <div>
          <label className="label">Notiz (optional)</label>
          <textarea className="input min-h-[60px] resize-y" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Infos, Kontakt, Sonstiges …" />
        </div>

        {acts && (
          <div>
            <label className="label">Dateien (Techrider, Hospitality …)</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <div className="space-y-1.5">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                  <Icon name="download" size={15} className="text-accent" />
                  <a href={`/api/attachments/${f.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-accent-dark">
                    {f.filename}
                  </a>
                  <button className="text-stone-400 hover:text-red-500" onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} aria-label="Entfernen">
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-ghost mt-1.5 w-full py-2 text-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Icon name="download" size={16} className="rotate-180" /> {uploading ? "Lädt …" : "Datei hochladen"}
            </button>
          </div>
        )}

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

function MarkerModal({
  ressortId,
  board,
  marker,
  onClose,
  onSaved,
}: {
  ressortId: number;
  board: BoardKind;
  marker: ScheduleMarker | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!marker;
  const [titel, setTitel] = useState(marker?.titel ?? "");
  const [startMin, setStartMin] = useState(marker?.startMin ?? 2 * 60); // 18:00
  const [endMin, setEndMin] = useState(marker?.endMin ?? 4 * 60); // 20:00
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!titel.trim()) return setError("Bezeichnung erforderlich");
    if (endMin <= startMin) return setError("Ende muss nach Start liegen");
    setSaving(true);
    setError("");
    const payload = { board, titel: titel.trim(), startMin, endMin };
    try {
      if (editing) await api.patch(`/ressorts/${ressortId}/schedule/markers/${marker!.id}`, payload);
      else await api.post(`/ressorts/${ressortId}/schedule/markers`, payload);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/ressorts/${ressortId}/schedule/markers/${marker!.id}`);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Zeitfenster bearbeiten" : "Neues Zeitfenster"}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={remove} aria-label="Löschen">
              <Icon name="trash" size={17} />
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
          <label className="label">Bezeichnung</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="z. B. Nachtessen" />
          <p className="mt-1 text-xs text-slate-400">Wird als dezentes Band über alle Spalten angezeigt.</p>
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
