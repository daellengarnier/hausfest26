"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { Avatar, Modal, Spinner } from "@/components/Ui";
import type { Rolle } from "@/lib/uiTypes";
import { Icon } from "@/components/Icon";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  rolle: Rolle;
  avatarColor: string;
  active: boolean;
  mustChangePassword: boolean;
}

interface AdminRessort {
  id: number;
  name: string;
  beschreibung: string;
  farbe: string;
  leads: { id: number; name: string; avatarColor: string }[];
}

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#64748b"];

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "ressorts">("users");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Administration</h1>
        <Link href="/" className="text-sm text-slate-400">
          ← zurück
        </Link>
      </div>
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 text-sm font-medium">
        <button className={`flex-1 rounded-lg py-2 ${tab === "users" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("users")}>
          Accounts
        </button>
        <button className={`flex-1 rounded-lg py-2 ${tab === "ressorts" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("ressorts")}>
          Ressorts
        </button>
      </div>
      {tab === "users" ? <UsersAdmin /> : <RessortsAdmin />}
    </div>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [menuUser, setMenuUser] = useState<AdminUser | null>(null);
  const [pwResult, setPwResult] = useState<{ name: string; pw: string; created?: boolean } | null>(null);

  const load = () => api.get<{ users: AdminUser[] }>("/users/admin/all").then((d) => setUsers(d.users));
  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (u: AdminUser) => {
    await api.patch(`/users/admin/${u.id}`, { active: !u.active });
    setMenuUser(null);
    load();
  };
  const setRole = async (u: AdminUser, rolle: Rolle) => {
    await api.patch(`/users/admin/${u.id}`, { rolle });
    setMenuUser(null);
    load();
  };
  const resetPw = async (u: AdminUser) => {
    const { placeholderPassword } = await api.post<{ placeholderPassword: string }>(`/users/admin/${u.id}/reset-password`, {});
    setMenuUser(null);
    setPwResult({ name: u.name, pw: placeholderPassword });
  };

  if (!users) return <Spinner />;

  return (
    <div className="space-y-3">
      <button className="btn-primary w-full" onClick={() => setAddOpen(true)}>
        + Account anlegen
      </button>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${u.active ? "" : "opacity-50"}`}>
            <Avatar name={u.name} color={u.avatarColor} size={38} userId={u.id} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {u.name} {u.rolle === "admin" && <span className="chip bg-accent/10 text-accent-dark">Admin</span>}
              </p>
              <p className="truncate text-xs text-slate-500">{u.email}</p>
            </div>
            <button
              className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
              onClick={() => setMenuUser(u)}
              aria-label={`Aktionen für ${u.name}`}
            >
              ⋯
            </button>
          </div>
        ))}
      </div>

      {menuUser && (
        <Modal open onClose={() => setMenuUser(null)} title={menuUser.name}>
          <div className="space-y-2">
            <button className="btn-ghost w-full justify-start" onClick={() => setRole(menuUser, menuUser.rolle === "admin" ? "mitglied" : "admin")}>
              {menuUser.rolle === "admin" ? "Zu Mitglied machen" : "Zu Admin machen"}
            </button>
            <button className="btn-ghost w-full justify-start" onClick={() => resetPw(menuUser)}>
              Passwort zurücksetzen
            </button>
            <button className="btn-danger w-full justify-start" onClick={() => toggleActive(menuUser)}>
              {menuUser.active ? "Account deaktivieren" : "Account aktivieren"}
            </button>
          </div>
        </Modal>
      )}

      {pwResult && <PasswordResultModal result={pwResult} onClose={() => setPwResult(null)} />}

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(pw, name) => {
          setPwResult({ name, pw, created: true });
          load();
        }}
      />
    </div>
  );
}

function PasswordResultModal({ result, onClose }: { result: { name: string; pw: string; created?: boolean }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(result.pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  return (
    <Modal
      open
      onClose={onClose}
      title={result.created ? "Account angelegt" : "Passwort zurückgesetzt"}
      footer={
        <button className="btn-primary w-full" onClick={onClose}>
          Fertig
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Platzhalter-Passwort für <span className="font-semibold text-ink">{result.name}</span> — beim ersten Login muss es geändert werden.
        </p>
        <button
          type="button"
          onClick={copy}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-left ring-1 ring-emerald-100 active:scale-[0.99]"
        >
          <span className="select-all break-all font-mono text-lg font-bold text-emerald-800">{result.pw}</span>
          <span className="shrink-0 text-xs font-semibold text-emerald-600">{copied ? "Kopiert ✓" : "Kopieren"}</span>
        </button>
      </div>
    </Modal>
  );
}

function AddUserModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (pw: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState<Rolle>("mitglied");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim() || !email.trim()) return setError("Name und E-Mail erforderlich");
    setSaving(true);
    setError("");
    try {
      const res = await api.post<{ placeholderPassword: string }>("/users/admin", {
        name: name.trim(),
        email: email.trim(),
        rolle,
        password: password || undefined,
      });
      onSaved(res.placeholderPassword, name.trim());
      setName("");
      setEmail("");
      setPassword("");
      setRolle("mitglied");
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
      title="Account anlegen"
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
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">E-Mail</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@al-daellen.ch" />
        </div>
        <div>
          <label className="label">Rolle</label>
          <select className="input" value={rolle} onChange={(e) => setRolle(e.target.value as Rolle)}>
            <option value="mitglied">Mitglied</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="label">Platzhalter-Passwort (optional)</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={'leer = Standard „spinnfest"'} />
          <p className="mt-1 text-xs text-slate-400">Wird beim ersten Login geändert.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function RessortsAdmin() {
  const [ressorts, setRessorts] = useState<AdminRessort[] | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: number; name: string; avatarColor: string }[]>([]);
  const [editing, setEditing] = useState<AdminRessort | "new" | null>(null);

  const load = () => api.get<{ ressorts: AdminRessort[] }>("/ressorts").then((d) => setRessorts(d.ressorts));
  useEffect(() => {
    load();
    api.get<{ users: { id: number; name: string; avatarColor: string }[] }>("/users").then((d) => setAllUsers(d.users));
  }, []);

  if (!ressorts) return <Spinner />;

  return (
    <div className="space-y-3">
      <button className="btn-primary w-full" onClick={() => setEditing("new")}>
        + Ressort anlegen
      </button>
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {ressorts.map((r) => (
          <button key={r.id} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50" onClick={() => setEditing(r)}>
            <span className="h-8 w-2 rounded-full" style={{ background: r.farbe }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.name}</p>
              <p className="truncate text-xs text-slate-500">{r.leads.map((l) => l.name).join(", ") || "kein Lead"}</p>
            </div>
            <Icon name="pencil" size={16} className="text-stone-300" />
          </button>
        ))}
      </div>
      {editing && (
        <RessortEditModal
          ressort={editing === "new" ? null : editing}
          allUsers={allUsers}
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

function RessortEditModal({
  ressort,
  allUsers,
  onClose,
  onSaved,
}: {
  ressort: AdminRessort | null;
  allUsers: { id: number; name: string; avatarColor: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!ressort;
  const [name, setName] = useState(ressort?.name ?? "");
  const [beschreibung, setBeschreibung] = useState(ressort?.beschreibung ?? "");
  const [farbe, setFarbe] = useState(ressort?.farbe ?? COLORS[9]);
  const [leadIds, setLeadIds] = useState<number[]>(ressort?.leads.map((l) => l.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { name: name.trim(), beschreibung, farbe, leadUserIds: leadIds };
    try {
      if (editing) await api.patch(`/ressorts/${ressort!.id}`, payload);
      else await api.post("/ressorts", payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/ressorts/${ressort!.id}`);
    onSaved();
  };

  const toggleLead = (id: number) => setLeadIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Ressort bearbeiten" : "Ressort anlegen"}
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
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Beschreibung</label>
          <textarea className="input min-h-[60px] resize-y" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
        <div>
          <label className="label">Farbe</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFarbe(c)}
                className={`h-8 w-8 rounded-full ring-2 ${farbe === c ? "ring-slate-800" : "ring-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Lead(s)</label>
          <div className="flex flex-wrap gap-2">
            {allUsers.map((u) => {
              const active = leadIds.includes(u.id);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => toggleLead(u.id)}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm ${
                    active ? "border-accent bg-accent/10 text-accent-dark" : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <Avatar name={u.name} color={u.avatarColor} size={22} userId={u.id} showName={false} />
                  {u.name}
                </button>
              );
            })}
          </div>
        </div>
        {editing && (
          <div className="border-t border-slate-100 pt-3">
            {confirmDel ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Wirklich löschen? Alle Todos & Sub-Ressorts gehen verloren.</span>
                <button className="btn-danger ml-auto px-3 py-1.5 text-sm" onClick={remove}>
                  Ja, löschen
                </button>
              </div>
            ) : (
              <button className="text-sm text-red-600" onClick={() => setConfirmDel(true)}>
                Ressort löschen
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
