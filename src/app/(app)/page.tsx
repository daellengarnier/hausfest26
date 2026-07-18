"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import { ressortHint } from "@/lib/ressortHint";
import { useAuth } from "@/components/AuthContext";
import type { RessortSummary } from "@/lib/uiTypes";

const TICKET_URL = "https://www.petzi.ch/en/organiser/236127/x2nv44btSyy-vzACtazc3A/";
const TICKET_PASSWORD = "viaspinnerei";
const SCHICHT_URL = "https://spinnplan-23.netlify.app?event=6f4b7584-2ca0-4687-8a8b-b0e4ba5f9387";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  if (h < 23) return "Guten Abend";
  return "Gute Nacht";
}

export default function WelcomePage() {
  const { user } = useAuth();
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");
  const [hi, setHi] = useState("Hallo");
  const [invite, setInvite] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const copyLink = (url: string, key: string) =>
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(""), 1400);
    });

  useEffect(() => {
    api.get<{ text: string }>("/invite").then((d) => setInvite(d.text)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setHi(greeting());
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, []);

  // Programmübersicht ist kein Ressort, sondern der Programm-Einstieg (oben, eigener Look).
  const programm = (ressorts ?? []).find((r) => r.hatZeitplan) ?? null;
  const normalRessorts = (ressorts ?? []).filter((r) => !r.hatZeitplan);

  return (
    <div className="space-y-4">
      {/* Begrüssung + Links – ohne Box, direkt auf dem Hintergrund */}
      <div className="px-1 pt-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {hi}, <span className="brand-text">{user?.name}</span>
        </h1>

        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <a href={SCHICHT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 py-2 text-sm">
              <Icon name="calendar" size={15} /> Schichtplan öffnen
            </a>
            <button className="btn-ghost px-3 py-2 text-sm" onClick={() => copyLink(SCHICHT_URL, "schicht")} aria-label="Schichtplan-Link kopieren">
              <Icon name={copiedLink === "schicht" ? "check" : "copy"} size={16} /> {copiedLink === "schicht" ? "Kopiert" : "Link"}
            </button>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => invite && copyLink(invite, "einladung")}>
              <Icon name={copiedLink === "einladung" ? "check" : "send"} size={15} /> {copiedLink === "einladung" ? "Einladung kopiert" : "Einladung kopieren"}
            </button>
            <button className="btn-ghost px-3 py-2 text-sm" onClick={() => setInviteOpen(true)} aria-label="Einladung bearbeiten">
              <Icon name="pencil" size={16} />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Ticket-Passwort:{" "}
          <button
            onClick={() =>
              navigator.clipboard?.writeText(TICKET_PASSWORD).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              })
            }
            className="font-mono font-bold text-accent-dark underline decoration-dotted underline-offset-2"
          >
            {TICKET_PASSWORD}
          </button>
          {copied ? <span className="ml-1 text-accent">kopiert</span> : <span className="text-stone-400"> (tippen zum Kopieren)</span>}
        </p>

        <a href={TICKET_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full py-2 text-sm">
          <Icon name="ticket" size={15} /> Tickets öffnen
        </a>
      </div>

      {/* Programm-Einstieg – kein Ressort, eigener Look */}
      {programm && (
        <Link
          href={`/ressort/${programm.id}`}
          className="card flex items-center gap-3.5 overflow-hidden p-4"
          style={{ backgroundImage: `linear-gradient(135deg, ${programm.farbe}1f, transparent 70%)` }}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: programm.farbe }}>
            <Icon name="music" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="lbl" style={{ color: programm.farbe }}>
              Programm
            </p>
            <p className="text-lg font-extrabold leading-tight text-ink">Programmübersicht</p>
            <p className="mt-0.5 text-xs text-stone-500">Line-up & Öffnungszeiten Bars</p>
          </div>
          <Icon name="chevron" size={18} className="shrink-0 text-stone-300" />
        </Link>
      )}

      {/* Ressorts – kompakt */}
      <div>
        <h2 className="lbl mb-2 px-1">Ressorts</h2>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!ressorts ? (
          <Spinner label="Lade Ressorts …" />
        ) : normalRessorts.length === 0 ? (
          <EmptyState title="Noch keine Ressorts" hint={user?.rolle === "admin" ? "Lege im Admin-Bereich Ressorts an." : "Der Admin legt die Ressorts an."} />
        ) : (
          <div className="card divide-y divide-stone-100 overflow-hidden">
            {normalRessorts.map((r) => (
              <Link key={r.id} href={`/ressort/${r.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-stone-50">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset"
                  style={{ background: `${r.farbe}1c`, color: r.farbe, borderColor: `${r.farbe}3a` }}
                >
                  <Icon name={ressortIcon(r.name)} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate font-semibold text-ink">{r.name}</p>
                    {r.leads.length > 0 && (
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-stone-400">
                        {r.leads.map((l) => (
                          <span key={l.id} className="inline-flex items-center gap-1">
                            <Avatar name={l.name} color={l.avatarColor} size={14} userId={l.id} showName={false} />
                            {l.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  {ressortHint(r) && <p className="truncate text-xs text-stone-400">{ressortHint(r)}</p>}
                </div>
                {r.openTodos > 0 && (
                  <span className="chip shrink-0" style={{ background: `${r.farbe}1c`, color: r.farbe }}>
                    {r.openTodos} offen
                  </span>
                )}
                <Icon name="chevron" size={16} className="shrink-0 text-stone-300" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {inviteOpen && (
        <InviteModal
          text={invite}
          onClose={() => setInviteOpen(false)}
          onSaved={(t) => {
            setInvite(t);
            setInviteOpen(false);
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ text, onClose, onSaved }: { text: string; onClose: () => void; onSaved: (t: string) => void }) {
  const [value, setValue] = useState(text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!value.trim()) return setError("Text erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.put("/invite", { text: value.trim() });
      onSaved(value.trim());
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
      title="Einladungstext bearbeiten"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            Speichern
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <label className="label">Einladung (für SMS/WhatsApp)</label>
        <textarea className="input min-h-[220px] resize-y text-sm" value={value} onChange={(e) => setValue(e.target.value)} />
        <p className="text-xs text-stone-400">Wird für alle geändert. Der „Einladung kopieren“-Button kopiert diesen Text.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
