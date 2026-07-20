"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { useAuth } from "./AuthContext";
import { Avatar, EmptyState, Modal, Spinner } from "./Ui";
import { Icon } from "./Icon";
import { EXPENSE_CATEGORIES, CATEGORY_COLOR, formatChf } from "@/lib/finance";
import { formatDate } from "@/lib/uiUtil";
import type { Attachment, Expense, CategoryBudget } from "@/lib/uiTypes";

function parseChf(s: string): number {
  const v = parseFloat(String(s).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
}

export function Finanzen({ ressortId }: { ressortId: number }) {
  const { user } = useAuth();
  const isAdmin = user?.rolle === "admin";
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[] | null>(null);
  const [defizit, setDefizit] = useState(0);
  const [expModal, setExpModal] = useState<Expense | "new" | null>(null);
  const [budModal, setBudModal] = useState<{ kategorie: string; betragCents: number } | null>(null);
  const [defModal, setDefModal] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const loadExpenses = () => api.get<{ expenses: Expense[] }>(`/expenses?ressortId=${ressortId}`).then((d) => setExpenses(d.expenses));
  const loadBudget = () =>
    api.get<{ budgets: CategoryBudget[]; defizitgarantieCents: number }>(`/budget`).then((d) => {
      setBudgets(d.budgets);
      setDefizit(d.defizitgarantieCents);
    });
  useEffect(() => {
    loadExpenses();
    loadBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  const { mineCents, totalIst, totalPlan, byUser, kostenstellen } = useMemo(() => {
    const exp = expenses ?? [];
    const budMap = new Map((budgets ?? []).map((b) => [b.kategorie, b.betragCents]));
    let mine = 0,
      ist = 0;
    const usr = new Map<number, { id: number; name: string; color: string; cents: number }>();
    const expByCat = new Map<string, Expense[]>();
    for (const e of exp) {
      ist += e.betragCents;
      if (e.userId === user?.id) mine += e.betragCents;
      const arr = expByCat.get(e.kategorie) ?? [];
      arr.push(e);
      expByCat.set(e.kategorie, arr);
      if (e.userId != null) {
        const cur = usr.get(e.userId) ?? { id: e.userId, name: e.userName ?? "?", color: e.userColor ?? "#8a8172", cents: 0 };
        cur.cents += e.betragCents;
        usr.set(e.userId, cur);
      }
    }
    let plan = 0;
    for (const v of budMap.values()) plan += v;
    const order = [...EXPENSE_CATEGORIES] as string[];
    const all = new Set<string>([...order, ...expByCat.keys(), ...budMap.keys()]);
    const rows = [...all]
      .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
      .map((c) => ({ kategorie: c, ist: (expByCat.get(c) ?? []).reduce((s, e) => s + e.betragCents, 0), plan: budMap.get(c) ?? 0, expenses: expByCat.get(c) ?? [] }));
    return { mineCents: mine, totalIst: ist, totalPlan: plan, byUser: [...usr.values()].sort((a, b) => b.cents - a.cents), kostenstellen: rows };
  }, [expenses, budgets, user]);

  const restCents = totalPlan - totalIst;
  const loading = expenses === null || budgets === null;

  return (
    <div className="space-y-4">
      {/* Kosten-Übersicht */}
      <div className="card overflow-hidden">
        <div className="hero-gradient px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Kosten-Übersicht</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-white/70">Ausgegeben (Ist)</p>
              <p className="text-3xl font-extrabold leading-tight">CHF {formatChf(totalIst)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70">Budget (Plan)</p>
              <p className="text-lg font-bold leading-tight">CHF {formatChf(totalPlan)}</p>
            </div>
          </div>
          {totalPlan > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white/90" style={{ width: `${Math.min(100, (totalIst / totalPlan) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-white/85">
                {restCents >= 0 ? `Noch CHF ${formatChf(restCents)} im Budget` : `CHF ${formatChf(-restCents)} über Budget`}
              </p>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/75">
            <span>Meine Ausgaben: CHF {formatChf(mineCents)}</span>
            <button
              className={`text-white/70 ${isAdmin ? "underline decoration-dotted underline-offset-2" : "cursor-default"}`}
              onClick={() => isAdmin && setDefModal(true)}
              disabled={!isAdmin}
            >
              Defizitgarantie: {defizit > 0 ? `CHF ${formatChf(defizit)}` : "–"} (separat)
            </button>
          </div>
        </div>
        <div className="p-3">
          <button className="btn-primary w-full py-2 text-sm" onClick={() => setExpModal("new")}>
            <Icon name="plus" size={15} /> Ausgabe erfassen
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Lade Finanzen …" />
      ) : (
        <>
          <div>
            <h3 className="lbl mb-2 px-1">Kostenstellen</h3>
            <div className="space-y-2">
              {kostenstellen.map((k) => {
                const color = CATEGORY_COLOR[k.kategorie] ?? "#8a8172";
                const over = k.plan > 0 && k.ist > k.plan;
                const noPlan = k.plan === 0 && k.ist > 0;
                const width = k.plan > 0 ? Math.min(100, (k.ist / k.plan) * 100) : k.ist > 0 ? 100 : 0;
                const isOpen = open[k.kategorie];
                return (
                  <div key={k.kategorie} className="card overflow-hidden">
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen((o) => ({ ...o, [k.kategorie]: !o[k.kategorie] }))}>
                          <Icon name="chevron" size={15} className={`shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{k.kategorie}</span>
                        </button>
                        <div className="flex shrink-0 flex-col items-end">
                          <span className="text-sm font-bold tabular-nums text-ink">CHF {formatChf(k.ist)}</span>
                          <button
                            className={`text-xs tabular-nums text-stone-400 ${isAdmin ? "underline decoration-dotted underline-offset-2" : "cursor-default"}`}
                            onClick={() => isAdmin && setBudModal({ kategorie: k.kategorie, betragCents: k.plan })}
                            disabled={!isAdmin}
                          >
                            / {k.plan > 0 ? formatChf(k.plan) : "–"}
                          </button>
                        </div>
                      </div>
                      <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#efe7d8" }}>
                        <span className="block h-full rounded-full" style={{ width: `${width}%`, background: over || noPlan ? "#c2453d" : color }} />
                      </span>
                    </div>
                    {isOpen && (
                      <div className="divide-y divide-stone-100 border-t border-stone-100">
                        {k.expenses.length === 0 && <p className="px-3 py-2 text-sm text-stone-400">Noch keine Ausgaben.</p>}
                        {k.expenses.map((e) =>
                          e.actId != null ? (
                            <div key={e.id} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
                              <span className="min-w-0 flex-1 truncate text-stone-700">
                                {e.beschreibung}
                                <span className="ml-1 text-xs text-stone-400">(via Act)</span>
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-ink">CHF {formatChf(e.betragCents)}</span>
                            </div>
                          ) : (
                            <button key={e.id} onClick={() => setExpModal(e)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm active:bg-stone-50">
                              <span className="min-w-0 flex-1 truncate text-stone-700">
                                {e.beschreibung || k.kategorie}
                                {e.userName && <span className="ml-1 text-xs text-stone-400">· {e.userId === user?.id ? "du" : e.userName}</span>}
                              </span>
                              {e.belegId && <Icon name="file" size={13} className="shrink-0 text-stone-400" />}
                              <span className="shrink-0 font-semibold tabular-nums text-ink">CHF {formatChf(e.betragCents)}</span>
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {byUser.length > 1 && (
            <div className="card p-4">
              <h3 className="lbl mb-2">Ausgelegt nach Person</h3>
              <div className="space-y-2">
                {byUser.map((u) => (
                  <div key={u.name} className="flex items-center gap-2 text-sm">
                    <Avatar name={u.name} color={u.color} size={22} userId={u.id} />
                    <span className="flex-1 text-stone-700">{u.name}</span>
                    <span className="font-semibold">CHF {formatChf(u.cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {expModal && (
        <ExpenseModal
          ressortId={ressortId}
          expense={expModal === "new" ? null : expModal}
          canDelete={expModal !== "new"}
          onClose={() => setExpModal(null)}
          onSaved={() => {
            setExpModal(null);
            loadExpenses();
          }}
        />
      )}
      {budModal && (
        <CategoryBudgetModal
          kategorie={budModal.kategorie}
          betragCents={budModal.betragCents}
          onClose={() => setBudModal(null)}
          onSaved={() => {
            setBudModal(null);
            loadBudget();
          }}
        />
      )}
      {defModal && (
        <DefizitModal
          betragCents={defizit}
          onClose={() => setDefModal(false)}
          onSaved={() => {
            setDefModal(false);
            loadBudget();
          }}
        />
      )}
    </div>
  );
}

function CategoryBudgetModal({ kategorie, betragCents, onClose, onSaved }: { kategorie: string; betragCents: number; onClose: () => void; onSaved: () => void }) {
  const [betrag, setBetrag] = useState(betragCents ? (betragCents / 100).toFixed(2) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    const cents = betrag.trim() ? parseChf(betrag) : 0;
    if (!Number.isFinite(cents) || cents < 0) return setError("Ungültiger Betrag");
    setSaving(true);
    setError("");
    try {
      await api.put("/budget", { kategorie, betragCents: cents });
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
      title={`Budget: ${kategorie}`}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>Speichern</button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="label">Budget (Plan) für {kategorie} – CHF</label>
        <input className="input" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="0.00" autoFocus />
        <p className="text-xs text-stone-400">Summe aller Kostenstellen-Budgets = Gesamtbudget (Plan).</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

function DefizitModal({ betragCents, onClose, onSaved }: { betragCents: number; onClose: () => void; onSaved: () => void }) {
  const [betrag, setBetrag] = useState(betragCents ? (betragCents / 100).toFixed(2) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    const cents = betrag.trim() ? parseChf(betrag) : 0;
    if (!Number.isFinite(cents) || cents < 0) return setError("Ungültiger Betrag");
    setSaving(true);
    setError("");
    try {
      await api.put("/budget", { defizitgarantieCents: cents });
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
      title="Defizitgarantie"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>Speichern</button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="label">Defizitgarantie (CHF)</label>
        <input className="input" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="0.00" autoFocus />
        <p className="text-xs text-stone-400">Wird separat notiert und zählt nicht zum Budget (Plan).</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

function ExpenseModal({
  ressortId,
  expense,
  canDelete,
  onClose,
  onSaved,
}: {
  ressortId: number;
  expense: Expense | null;
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!expense;
  const [betrag, setBetrag] = useState(expense ? (expense.betragCents / 100).toFixed(2) : "");
  const [kategorie, setKategorie] = useState(expense?.kategorie ?? EXPENSE_CATEGORIES[0]);
  const [beschreibung, setBeschreibung] = useState(expense?.beschreibung ?? "");
  const [datum, setDatum] = useState(expense?.datum ?? "");
  const [beleg, setBeleg] = useState<Attachment | null>(
    expense?.belegId ? { id: expense.belegId, filename: expense.belegFilename ?? "Beleg", mime: expense.belegMime ?? "", size: 0 } : null,
  );
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
      setBeleg(attachment);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    const cents = parseChf(betrag);
    if (!Number.isFinite(cents) || cents <= 0) return setError("Bitte einen gültigen Betrag angeben");
    if (!beschreibung.trim()) return setError("Bitte eine Beschreibung angeben");
    setSaving(true);
    setError("");
    const payload = { ressortId, betragCents: cents, kategorie, beschreibung: beschreibung.trim(), datum: datum || null, belegId: beleg?.id ?? null };
    try {
      if (editing) await api.patch(`/expenses/${expense!.id}`, payload);
      else await api.post("/expenses", payload);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/expenses/${expense!.id}`);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Ausgabe bearbeiten" : "Ausgabe erfassen"}
      footer={
        <div className="flex gap-2">
          {canDelete && (
            <button className="btn-danger" onClick={remove} aria-label="Löschen">
              <Icon name="trash" size={17} />
            </button>
          )}
          <button className="btn-ghost flex-1" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving || uploading}>Speichern</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Betrag (CHF)</label>
            <input className="input" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="0.00" autoFocus />
          </div>
          <div>
            <label className="label">Datum</label>
            <input type="date" className="input" value={datum ?? ""} onChange={(e) => setDatum(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Kostenstelle</label>
          <select className="input" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Beschreibung</label>
          <input className="input" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Wofür? z. B. Farbe & Pinsel" />
        </div>
        <div>
          <label className="label">Beleg (Foto/PDF, optional)</label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {beleg ? (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
              <Icon name="file" size={16} className="text-accent" />
              <a href={`/api/attachments/${beleg.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-accent-dark">
                {beleg.filename}
              </a>
              <button className="text-stone-400 hover:text-red-500" onClick={() => setBeleg(null)} aria-label="Beleg entfernen">
                <Icon name="close" size={15} />
              </button>
            </div>
          ) : (
            <button className="btn-ghost w-full py-2 text-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Icon name="download" size={16} className="rotate-180" /> {uploading ? "Lädt …" : "Beleg hochladen"}
            </button>
          )}
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
