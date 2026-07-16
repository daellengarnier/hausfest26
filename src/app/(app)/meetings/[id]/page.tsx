"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, Modal, Spinner } from "@/components/Ui";
import { useAuth } from "@/components/AuthContext";
import { VOTE_CLASSES, VOTE_LABEL, formatDateLong, relTime } from "@/lib/uiUtil";
import type { MeetingDetail, Verfuegbarkeit } from "@/lib/uiTypes";
import { Icon } from "@/components/Icon";

const VOTES: Verfuegbarkeit[] = ["ja", "vielleicht", "nein"];

export default function MeetingPage() {
  const params = useParams<{ id: string }>();
  const meetingId = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [addSlotOpen, setAddSlotOpen] = useState(false);

  const load = useCallback(
    () => api.get<MeetingDetail>(`/meetings/${meetingId}`).then(setData).catch((e) => setError((e as Error).message)),
    [meetingId],
  );

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const vote = async (slotId: number, verfuegbarkeit: Verfuegbarkeit) => {
    setData(await api.put<MeetingDetail>(`/meetings/${meetingId}/votes`, { slotId, verfuegbarkeit }));
  };
  const fixSlot = async (slotId: number) => {
    setData(await api.post<MeetingDetail>(`/meetings/${meetingId}/fix`, { slotId }));
    window.dispatchEvent(new Event("hausfest:refresh-inbox"));
  };
  const reopen = async () => setData(await api.patch<MeetingDetail>(`/meetings/${meetingId}`, { status: "umfrage_laeuft" }));
  const setErledigt = async () => setData(await api.patch<MeetingDetail>(`/meetings/${meetingId}`, { status: "erledigt" }));
  const remove = async () => {
    await api.del(`/meetings/${meetingId}`);
    router.push("/meetings");
  };

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner label="Lade Sitzung …" />;

  const { meeting, slots } = data;
  const fixedSlot = slots.find((s) => s.id === meeting.fixierterSlotId);
  const showPoll = meeting.status === "umfrage_laeuft";
  const myId = user?.id;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <Link href="/meetings" className="text-sm text-slate-400">
          ← Sitzungen
        </Link>
        <h1 className="mt-1 text-xl font-bold">{meeting.titel}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {meeting.ressortName && (
            <Link href={`/ressort/${meeting.ressortId}`} className="chip" style={{ background: `${meeting.ressortFarbe}1a`, color: meeting.ressortFarbe ?? "#64748b" }}>
              {meeting.ressortName}
            </Link>
          )}
          {meeting.organisatorName && <span className="text-slate-400">von {meeting.organisatorName}</span>}
        </div>
        {meeting.beschreibung && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{meeting.beschreibung}</p>}

        {fixedSlot && (
          <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Fixierter Termin</p>
            <p className="font-semibold">
              {formatDateLong(fixedSlot.datum)}
              {fixedSlot.startzeit ? `, ${fixedSlot.startzeit}` : ""}
              {fixedSlot.endzeit ? `–${fixedSlot.endzeit}` : ""}
            </p>
          </div>
        )}
      </div>

      {showPoll ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold">Verfügbarkeit</h2>
            <button className="text-sm font-medium text-accent" onClick={() => setAddSlotOpen(true)}>
              + Termin
            </button>
          </div>

          {slots.map((slot) => {
            const myVote = slot.votes.find((v) => v.userId === myId)?.verfuegbarkeit;
            return (
              <div key={slot.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatDateLong(slot.datum)}</p>
                    {slot.startzeit && (
                      <p className="text-sm text-slate-500">
                        {slot.startzeit}
                        {slot.endzeit ? `–${slot.endzeit}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 text-xs">
                    <span className="chip bg-accent/10 text-accent-dark"><Icon name="check" size={12} /> {slot.tally.ja}</span>
                    <span className="chip bg-amber-100 text-amber-700">? {slot.tally.vielleicht}</span>
                    <span className="chip bg-red-100 text-red-700"><Icon name="close" size={12} /> {slot.tally.nein}</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
                  {VOTES.map((v) => (
                    <button
                      key={v}
                      onClick={() => vote(slot.id, v)}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${myVote === v ? VOTE_CLASSES[v] + " shadow-sm" : "text-slate-500"}`}
                    >
                      {VOTE_LABEL[v]}
                    </button>
                  ))}
                </div>

                {slot.votes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {slot.votes.map((vt) => (
                      <span
                        key={vt.userId}
                        className="flex items-center gap-1 rounded-full bg-white py-0.5 pl-0.5 pr-2 text-xs ring-1 ring-slate-200"
                        title={`${vt.name}: ${VOTE_LABEL[vt.verfuegbarkeit]}`}
                      >
                        <Avatar name={vt.name} color={vt.avatarColor} size={18} />
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            vt.verfuegbarkeit === "ja" ? "bg-emerald-500" : vt.verfuegbarkeit === "vielleicht" ? "bg-amber-400" : "bg-red-400"
                          }`}
                        />
                      </span>
                    ))}
                  </div>
                )}

                <button onClick={() => fixSlot(slot.id)} className="btn-ghost mt-3 w-full py-2 text-sm">
                  Diesen Termin fixieren
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <ProtocolEditor meetingId={meetingId} initial={data.protocol?.inhalt ?? ""} updatedAt={data.protocol?.updatedAt ?? null} />
      )}

      <div className="card space-y-2 p-4">
        {meeting.status === "terminFixiert" && (
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={reopen}>
              Umfrage erneut öffnen
            </button>
            <button className="btn-ghost flex-1" onClick={setErledigt}>
              Als erledigt markieren
            </button>
          </div>
        )}
        {meeting.status === "erledigt" && (
          <button className="btn-ghost w-full" onClick={reopen}>
            Wieder öffnen
          </button>
        )}
        <button className="btn-danger w-full" onClick={() => setConfirmDel(true)}>
          Sitzung löschen
        </button>
      </div>

      <AddSlotModal open={addSlotOpen} onClose={() => setAddSlotOpen(false)} meetingId={meetingId} onAdded={setData} />

      <Modal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Sitzung löschen?"
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
        <p className="text-sm text-slate-600">Die Sitzung samt Terminen, Stimmen und Protokoll wird gelöscht.</p>
      </Modal>
    </div>
  );
}

function ProtocolEditor({ meetingId, initial, updatedAt }: { meetingId: number; initial: string; updatedAt: string | null }) {
  const [inhalt, setInhalt] = useState(initial);
  const [savedAt, setSavedAt] = useState<string | null>(updatedAt);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setInhalt(initial);
  }, [initial]);

  const scheduleSave = (value: string) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { protocol } = await api.put<{ protocol: { updatedAt: string } }>(`/meetings/${meetingId}/protocol`, { inhalt: value });
      setSavedAt(protocol.updatedAt);
      setStatus("saved");
    }, 900);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInhalt(e.target.value);
    scheduleSave(e.target.value);
  };

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Protokoll</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {status === "saving" ? "Speichert …" : savedAt ? `Gespeichert ${relTime(savedAt)}` : "Noch nicht gespeichert"}
        </div>
      </div>

      <div className="mb-2 flex gap-1 text-sm">
        <button className={`rounded-lg px-3 py-1 ${!showPreview ? "bg-slate-100 font-medium" : "text-slate-500"}`} onClick={() => setShowPreview(false)}>
          Schreiben
        </button>
        <button className={`rounded-lg px-3 py-1 ${showPreview ? "bg-slate-100 font-medium" : "text-slate-500"}`} onClick={() => setShowPreview(true)}>
          Vorschau
        </button>
      </div>

      {showPreview ? (
        <div className="prose-protocol min-h-[200px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(inhalt) }} />
      ) : (
        <textarea
          value={inhalt}
          onChange={onChange}
          placeholder={"# Protokoll\n\n- Anwesend: …\n- Beschlüsse: …\n\nMarkdown wird unterstützt."}
          className="input min-h-[260px] resize-y font-mono text-sm leading-relaxed"
        />
      )}

      <a href={`/api/meetings/${meetingId}/protocol/export`} className="btn-ghost mt-3 w-full py-2 text-sm" download>
        ⬇️ Als Markdown exportieren
      </a>
    </div>
  );
}

// Sehr einfacher Markdown→HTML-Renderer für die Protokoll-Vorschau.
function renderMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc(md).split("\n");
  let html = "";
  let inList = false;
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  for (const raw of lines) {
    const line = raw.trimEnd();
    const li = /^\s*[-*]\s+(.*)/.exec(line);
    if (li) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inline(li[1])}</li>`;
      continue;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    const h = /^(#{1,4})\s+(.*)/.exec(line);
    if (h) {
      const lvl = h[1].length;
      html += `<h${lvl}>${inline(h[2])}</h${lvl}>`;
    } else if (line !== "") {
      html += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html || '<p class="text-slate-400">Noch kein Inhalt.</p>';
}

function AddSlotModal({
  open,
  onClose,
  meetingId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: number;
  onAdded: (d: MeetingDetail) => void;
}) {
  const [datum, setDatum] = useState("");
  const [startzeit, setStartzeit] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!datum) return;
    setSaving(true);
    try {
      const fresh = await api.post<MeetingDetail>(`/meetings/${meetingId}/slots`, { datum, startzeit });
      onAdded(fresh);
      setDatum("");
      setStartzeit("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Termin hinzufügen"
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
      <div className="flex gap-2">
        <input type="date" className="input flex-1" value={datum} onChange={(e) => setDatum(e.target.value)} autoFocus />
        <input type="time" className="input w-32" value={startzeit} onChange={(e) => setStartzeit(e.target.value)} />
      </div>
    </Modal>
  );
}
