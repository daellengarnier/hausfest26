"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "./Ui";
import { Icon } from "./Icon";
import { formatChf } from "@/lib/finance";
import type { Act, ActFile, ActRubrik, Attachment } from "@/lib/uiTypes";

const START_HOUR = 16;
const SPAN = 960;
const STEP = 15;
const pad = (n: number) => String(n).padStart(2, "0");
const minToLabel = (min: number) => {
  const total = START_HOUR * 60 + min;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};
const TIME_OPTIONS = Array.from({ length: SPAN / STEP + 1 }, (_, i) => i * STEP);

interface Floor {
  name: string;
  farbe: string;
}

const TYP_LABEL: Record<string, string> = { band: "Band", dj: "DJ", andere: "Andere" };
const RUBRIKEN: { key: ActRubrik; label: string }[] = [
  { key: "techrider", label: "Techrider" },
  { key: "hospitality", label: "Hospitality-Rider" },
  { key: "sonstiges", label: "Weitere Dateien" },
];

function parseChf(s: string): number {
  const v = parseFloat(String(s).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
}

export function Acts({ ressortId }: { ressortId: number }) {
  const [acts, setActs] = useState<Act[] | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [modal, setModal] = useState<Act | "new" | null>(null);

  const load = () =>
    api.get<{ acts: Act[]; floors: Floor[] }>(`/acts?ressortId=${ressortId}`).then((d) => {
      setActs(d.acts);
      setFloors(d.floors ?? []);
    });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  const { sections, noSlot } = useMemo(() => {
    const list = acts ?? [];
    const byFloor = new Map<string, Act[]>();
    const ohne: Act[] = [];
    for (const a of list) {
      if (a.slot?.floor) {
        const arr = byFloor.get(a.slot.floor) ?? [];
        arr.push(a);
        byFloor.set(a.slot.floor, arr);
      } else ohne.push(a);
    }
    const order = floors.map((f) => f.name);
    const extra = [...byFloor.keys()].filter((n) => !order.includes(n));
    const secs = [...order, ...extra]
      .filter((n) => byFloor.has(n))
      .map((n) => ({
        name: n,
        farbe: floors.find((f) => f.name === n)?.farbe ?? "#8a8172",
        acts: (byFloor.get(n) ?? []).sort((a, b) => (a.slot?.startMin ?? 0) - (b.slot?.startMin ?? 0)),
      }));
    return { sections: secs, noSlot: ohne };
  }, [acts, floors]);

  return (
    <div className="space-y-4">
      <button className="btn-primary w-full" onClick={() => setModal("new")}>
        <Icon name="plus" size={17} /> Act hinzufügen
      </button>
      <p className="px-1 text-xs text-stone-500">
        Hier ist die Zentrale: Floor + Showtime eingeben – der Act erscheint automatisch im Line-up. Dazu Get-in, Soundcheck, Gage, Übernachtung & Rider.
      </p>

      {acts === null ? (
        <Spinner label="Lade Acts …" />
      ) : acts.length === 0 ? (
        <EmptyState title="Noch keine Acts" hint="Füge einen Act hinzu – mit Floor und Showtime landet er direkt im Line-up." />
      ) : (
        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.name}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="h-3 w-3 rounded-full" style={{ background: s.farbe }} />
                <span className="text-sm font-bold" style={{ color: s.farbe }}>
                  {s.name}
                </span>
                <span className="text-xs text-stone-400">
                  {s.acts.length} {s.acts.length === 1 ? "Act" : "Acts"}
                </span>
              </div>
              <div className="space-y-2.5">
                {s.acts.map((a) => (
                  <ActCard key={a.id} act={a} onOpen={() => setModal(a)} />
                ))}
              </div>
            </div>
          ))}
          {noSlot.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="h-3 w-3 rounded-full bg-stone-300" />
                <span className="text-sm font-bold text-stone-500">Noch nicht im Line-up</span>
                <span className="text-xs text-stone-400">{noSlot.length}</span>
              </div>
              <div className="space-y-2.5">
                {noSlot.map((a) => (
                  <ActCard key={a.id} act={a} onOpen={() => setModal(a)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ActModal
          ressortId={ressortId}
          act={modal === "new" ? null : modal}
          floors={floors}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ActCard({ act: a, onOpen }: { act: Act; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card w-full p-3.5 text-left active:bg-stone-50">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon name={a.typ === "dj" ? "music" : "star"} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-ink">{a.name || "Unbenannter Act"}</p>
            <span className="chip bg-stone-100 text-stone-500">{TYP_LABEL[a.typ] ?? a.typ}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            {a.slot && (
              <span className="inline-flex items-center gap-1 font-medium text-stone-600">
                <Icon name="clock" size={13} /> {minToLabel(a.slot.startMin)}–{minToLabel(a.slot.endMin)}
              </span>
            )}
            {a.getIn && (
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={13} /> Get-in {a.getIn}
              </span>
            )}
            {a.soundcheck && (
              <span className="inline-flex items-center gap-1">
                <Icon name="tools" size={13} /> SC {a.soundcheck}
              </span>
            )}
            {a.kostenCents != null && (
              <span className="inline-flex items-center gap-1 font-medium text-stone-600">
                <Icon name="coins" size={13} /> CHF {formatChf(a.kostenCents)}
              </span>
            )}
            {a.anzahlPersonen != null && (
              <span className="inline-flex items-center gap-1">
                <Icon name="user" size={13} /> {a.anzahlPersonen}
              </span>
            )}
            {a.uebernachtung && (
              <span className="inline-flex items-center gap-1 text-accent-dark">
                <Icon name="bed" size={14} /> Übernachtung
              </span>
            )}
            {a.files.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon name="file" size={13} /> {a.files.length}
              </span>
            )}
          </div>
        </div>
        <Icon name="chevron" size={16} className="mt-1 shrink-0 text-stone-300" />
      </div>
    </button>
  );
}

type LocalFile = { attachmentId: number; filename: string; mime: string; rubrik: ActRubrik };

function ActModal({
  ressortId,
  act,
  floors,
  onClose,
  onSaved,
}: {
  ressortId: number;
  act: Act | null;
  floors: Floor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!act;
  const [name, setName] = useState(act?.name ?? "");
  const [typ, setTyp] = useState<Act["typ"]>(act?.typ ?? "band");
  const [floor, setFloor] = useState(act?.slot?.floor ?? (act ? "" : floors[0]?.name ?? ""));
  const [startMin, setStartMin] = useState(act?.slot?.startMin ?? 4 * 60);
  const [endMin, setEndMin] = useState(act?.slot?.endMin ?? 5 * 60);
  const [getIn, setGetIn] = useState(act?.getIn ?? "");
  const [soundcheck, setSoundcheck] = useState(act?.soundcheck ?? "");
  const [gage, setGage] = useState(act?.kostenCents != null ? (act.kostenCents / 100).toFixed(2) : "");
  const [anzahl, setAnzahl] = useState(act?.anzahlPersonen != null ? String(act.anzahlPersonen) : "");
  const [uebernachtung, setUebernachtung] = useState(act?.uebernachtung ?? false);
  const [promotext, setPromotext] = useState(act?.promotext ?? "");
  const [notiz, setNotiz] = useState(act?.notiz ?? "");
  const [files, setFiles] = useState<LocalFile[]>(
    (act?.files ?? []).map((f: ActFile) => ({ attachmentId: f.attachmentId, filename: f.filename, mime: f.mime, rubrik: f.rubrik })),
  );
  const [uploading, setUploading] = useState<ActRubrik | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRefs = { techrider: useRef<HTMLInputElement>(null), hospitality: useRef<HTMLInputElement>(null), sonstiges: useRef<HTMLInputElement>(null) };

  const onFile = async (f: File, rubrik: ActRubrik) => {
    setUploading(rubrik);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/attachments", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload fehlgeschlagen");
      const { attachment } = (await res.json()) as { attachment: Attachment };
      setFiles((prev) => [...prev, { attachmentId: attachment.id, filename: attachment.filename, mime: attachment.mime, rubrik }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
      const ref = fileRefs[rubrik].current;
      if (ref) ref.value = "";
    }
  };

  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    if (floor && endMin <= startMin) return setError("Showtime-Ende muss nach dem Start liegen");
    setSaving(true);
    setError("");
    const cents = gage.trim() ? parseChf(gage) : null;
    const payload = {
      ressortId,
      name: name.trim(),
      typ,
      floor,
      startMin,
      endMin,
      getIn: getIn.trim(),
      soundcheck: soundcheck.trim(),
      kostenCents: cents && cents > 0 ? cents : null,
      anzahlPersonen: anzahl.trim() ? Number(anzahl) : null,
      uebernachtung,
      promotext: promotext.trim(),
      notiz: notiz.trim(),
      files: files.map((f) => ({ attachmentId: f.attachmentId, rubrik: f.rubrik })),
    };
    try {
      if (editing) {
        await api.patch(`/acts/${act!.id}`, payload);
      } else {
        const { id } = await api.post<{ id: number }>("/acts", payload);
        if (payload.files.length > 0) await api.patch(`/acts/${id}`, { files: payload.files });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/acts/${act!.id}`);
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
            <button className="btn-danger" onClick={remove} aria-label="Löschen">
              <Icon name="trash" size={17} />
            </button>
          )}
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving || !!uploading}>
            Speichern
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name (Band / DJ)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="z. B. The Spinners" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Typ</label>
            <select className="input" value={typ} onChange={(e) => setTyp(e.target.value as Act["typ"])}>
              <option value="band">Band</option>
              <option value="dj">DJ</option>
              <option value="andere">Andere</option>
            </select>
          </div>
          <div>
            <label className="label">Anzahl Personen</label>
            <input className="input" inputMode="numeric" value={anzahl} onChange={(e) => setAnzahl(e.target.value)} placeholder="z. B. 4" />
          </div>
        </div>

        {/* Line-up: Floor + Showtime */}
        <div className="rounded-xl bg-accent/5 p-3">
          <p className="lbl mb-2">Line-up</p>
          <div>
            <label className="label">Floor</label>
            <select className="input" value={floor} onChange={(e) => setFloor(e.target.value)}>
              <option value="">— nicht im Line-up —</option>
              {floors.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
              {floor && !floors.some((f) => f.name === floor) && <option value={floor}>{floor}</option>}
            </select>
          </div>
          {floor && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Showtime von</label>
                <select className="input" value={startMin} onChange={(e) => setStartMin(Number(e.target.value))}>
                  {TIME_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {minToLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Showtime bis</label>
                <select className="input" value={endMin} onChange={(e) => setEndMin(Number(e.target.value))}>
                  {TIME_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {minToLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-stone-400">Mit Floor & Showtime erscheint der Act automatisch im Line-up.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Get-in</label>
            <input type="time" className="input" value={getIn} onChange={(e) => setGetIn(e.target.value)} />
          </div>
          <div>
            <label className="label">Soundcheck</label>
            <input type="time" className="input" value={soundcheck} onChange={(e) => setSoundcheck(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Kosten / Gage (CHF)</label>
          <input className="input" inputMode="decimal" value={gage} onChange={(e) => setGage(e.target.value)} placeholder="0.00" />
          <p className="mt-1 text-xs text-stone-400">Wird in den Finanzen als Ausgabe „Gagen“ geführt.</p>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={uebernachtung} onChange={(e) => setUebernachtung(e.target.checked)} />
          <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
            <Icon name="bed" size={17} className="text-accent" /> Übernachtung benötigt
          </span>
        </label>
        <div>
          <label className="label">Promotext</label>
          <textarea className="input min-h-[70px] resize-y" value={promotext} onChange={(e) => setPromotext(e.target.value)} placeholder="Kurzbeschreibung für Promo/Programm …" />
        </div>
        <div>
          <label className="label">Notiz (intern)</label>
          <textarea className="input min-h-[50px] resize-y" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Kontakt, Absprachen, Sonstiges …" />
        </div>

        {RUBRIKEN.map((r) => {
          const list = files.filter((f) => f.rubrik === r.key);
          return (
            <div key={r.key}>
              <label className="label">{r.label}</label>
              <input
                ref={fileRefs[r.key]}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0], r.key)}
              />
              <div className="space-y-1.5">
                {list.map((f) => (
                  <div key={f.attachmentId} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                    <Icon name="file" size={15} className="text-accent" />
                    <a href={`/api/attachments/${f.attachmentId}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-accent-dark">
                      {f.filename}
                    </a>
                    <button className="text-stone-400 hover:text-red-500" onClick={() => setFiles((prev) => prev.filter((x) => x.attachmentId !== f.attachmentId))} aria-label="Entfernen">
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-ghost mt-1.5 w-full py-2 text-sm" onClick={() => fileRefs[r.key].current?.click()} disabled={!!uploading}>
                <Icon name="download" size={16} className="rotate-180" /> {uploading === r.key ? "Lädt …" : `${r.label} hochladen`}
              </button>
            </div>
          );
        })}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
