"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { useAuth } from "./AuthContext";
import { Avatar, EmptyState, Modal, Spinner } from "./Ui";
import { Icon } from "./Icon";
import { EXPENSE_CATEGORIES, CATEGORY_COLOR, formatChf } from "@/lib/finance";
import { formatDate } from "@/lib/uiUtil";
import type { Attachment, Expense, BudgetItem } from "@/lib/uiTypes";

function parseChf(s: string): number {
  const v = parseFloat(String(s).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
}

export function Finanzen({ ressortId }: { ressortId: number }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [budget, setBudget] = useState<BudgetItem[] | null>(null);
  const [expModal, setExpModal] = useState<Expense | "new" | null>(null);
  const [budModal, setBudModal] = useState<BudgetItem | "new" | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const loadExpenses = () => api.get<{ expenses: Expense[] }>(`/expenses?ressortId=${ressortId}`).then((d) => setExpenses(d.expenses));
  const loadBudget = () => api.get<{ budget: BudgetItem[] }>(`/budget?ressortId=${ressortId}`).then((d) => setBudget(d.budget));
  useEffect(() => {
    loadExpenses();
    loadBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  const { mineCents, totalIst, totalPlan, byUser, kostenstellen } = useMemo(() => {
    const exp = expenses ?? [];
    const bud = budget ?? [];
    let mine = 0,
      ist = 0,
      plan = 0;
    const usr = new Map<number, { name: string; color: string; cents: number }>();
    const expByCat = new Map<string, Expense[]>();
    const budByCat = new Map<string, BudgetItem[]>();
    for (const e of exp) {
      ist += e.betragCents;
      if (e.userId === user?.id) mine += e.betragCents;
      (expByCat.get(e.kategorie) ?? expByCat.set(e.kategorie, []).get(e.kategorie)!).push(e);
      if (e.userId != null) {
        const cur = usr.get(e.userId) ?? { name: e.userName ?? "?", color: e.userColor ?? "#8a8172", cents: 0 };
        cur.cents += e.betragCents;
        usr.set(e.userId, cur);
      }
    }
    for (const b of bud) {
      plan += b.betragCents;
      (budByCat.get(b.kategorie) ?? budByCat.set(b.kategorie, []).get(b.kategorie)!).push(b);
    }
    // Reihenfolge: definierte Kostenstellen zuerst, danach evtl. Alt-Kategorien.
    const order = [...EXPENSE_CATEGORIES] as string[];
    const all = new Set<string>([...order, ...expByCat.keys(), ...budByCat.keys()]);
    const rows = [...all]
      .filter((c) => (expByCat.get(c)?.length ?? 0) > 0 || (budByCat.get(c)?.length ?? 0) > 0)
      .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
      .map((c) => {
        const es = expByCat.get(c) ?? [];
        const bs = budByCat.get(c) ?? [];
        return {
          kategorie: c,
          ist: es.reduce((s, e) => s + e.betragCents, 0),
          plan: bs.reduce((s, b) => s + b.betragCents, 0),
          expenses: es,
          budget: bs,
        };
      });
    return {
      mineCents: mine,
      totalIst: ist,
      totalPlan: plan,
      byUser: [...usr.values()].sort((a, b) => b.cents - a.cents),
      kostenstellen: rows,
    };
  }, [expenses, budget, user]);

  const restCents = totalPlan - totalIst;
  const loading = expenses === null || budget === null;

  return (
    <div className="space-y-4">
      {/* Budget-Übersicht */}
      <div className="card overflow-hidden">
        <div className="brand-gradient px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Budget-Übersicht</p>
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
          <p className="mt-2 text-xs text-white/75">Meine Ausgaben: CHF {formatChf(mineCents)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <button className="btn-primary py-2 text-sm" onClick={() => setExpModal("new")}>
            <Icon name="plus" size={15} /> Ausgabe
          </button>
          <button className="btn-ghost py-2 text-sm" onClick={() => setBudModal("new")}>
            <Icon name="plus" size={15} /> Budgetposten
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Lade Finanzen …" />
      ) : (
        <>
          {/* Kostenstellen (Plan vs. Ist, aufklappbar) */}
          <div>
            <h3 className="mb-2 px-1 text-sm font-bold text-stone-500">Kostenstellen</h3>
            {kostenstellen.length === 0 ? (
              <EmptyState title="Noch keine Einträge" hint="Erfasse eine Ausgabe oder plane ein Budget – oder trage bei einem Act eine Gage ein." />
            ) : (
              <div className="space-y-2">
                {kostenstellen.map((k) => {
                  const color = CATEGORY_COLOR[k.kategorie] ?? "#8a8172";
                  const over = k.plan > 0 && k.ist > k.plan;
                  const noPlan = k.plan === 0 && k.ist > 0;
                  const width = k.plan > 0 ? Math.min(100, (k.ist / k.plan) * 100) : k.ist > 0 ? 100 : 0;
                  const isOpen = open[k.kategorie];
                  return (
                    <div key={k.kategorie} className="card overflow-hidden">
                      <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpen((o) => ({ ...o, [k.kategorie]: !o[k.kategorie] }))}>
                        <Icon name="chevron" size={15} className={`shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{k.kategorie}</span>
                          <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                            <span className="block h-full rounded-full" style={{ width: `${width}%`, background: over || noPlan ? "#c2453d" : color }} />
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-bold tabular-nums text-ink">CHF {formatChf(k.ist)}</span>
                          <span className="block text-xs tabular-nums text-stone-400">/ {k.plan > 0 ? formatChf(k.plan) : "–"}</span>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-stone-100 border-t border-stone-100">
                          {k.budget.map((b) => (
                            <button
                              key={`b${b.id}`}
                              onClick={() => setBudModal(b)}
                              disabled={b.actId != null}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-100"
                            >
                              <span className="chip bg-accent/10 text-accent-dark">Plan</span>
                              <span className="min-w-0 flex-1 truncate text-stone-700">
                                {b.titel || k.kategorie}
                                {b.actId != null && <span className="ml-1 text-xs text-stone-400">(via Act)</span>}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-stone-500">CHF {formatChf(b.betragCents)}</span>
                            </button>
                          ))}
                          {k.expenses.map((e) => (
                            <button key={`e${e.id}`} onClick={() => setExpModal(e)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
                              <span className="chip bg-stone-100 text-stone-500">Ist</span>
                              <span className="min-w-0 flex-1 truncate text-stone-700">
                                {e.beschreibung || k.kategorie}
                                {e.userName && <span className="ml-1 text-xs text-stone-400">· {e.userId === user?.id ? "du" : e.userName}</span>}
                              </span>
                              {e.belegId && <Icon name="file" size={13} className="shrink-0 text-stone-400" />}
                              <span className="shrink-0 font-semibold tabular-nums text-ink">CHF {formatChf(e.betragCents)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nach Person (für die Rückerstattung) */}
          {byUser.length > 1 && (
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-bold text-stone-500">Ausgelegt nach Person</h3>
              <div className="space-y-2">
                {byUser.map((u) => (
                  <div key={u.name} className="flex items-center gap-2 text-sm">
                    <Avatar name={u.name} color={u.color} size={22} />
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
          canDelete={expModal !== "new" && (expModal.userId === user?.id || user?.rolle === "admin")}
          onClose={() => setExpModal(null)}
          onSaved={() => {
            setExpModal(null);
            loadExpenses();
          }}
        />
      )}

      {budModal && (
        <BudgetModal
          ressortId={ressortId}
          item={budModal === "new" ? null : budModal}
          onClose={() => setBudModal(null)}
          onSaved={() => {
            setBudModal(null);
            loadBudget();
          }}
        />
      )}
    </div>
  );
}

function BudgetModal({
  ressortId,
  item,
  onClose,
  onSaved,
}: {
  ressortId: number;
  item: BudgetItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!item;
  const [betrag, setBetrag] = useState(item ? (item.betragCents / 100).toFixed(2) : "");
  const [kategorie, setKategorie] = useState(item?.kategorie ?? EXPENSE_CATEGORIES[0]);
  const [titel, setTitel] = useState(item?.titel ?? "");
  const [beschreibung, setBeschreibung] = useState(item?.beschreibung ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const cents = parseChf(betrag);
    if (!Number.isFinite(cents) || cents <= 0) return setError("Bitte einen gültigen Betrag angeben");
    setSaving(true);
    setError("");
    const payload = { ressortId, betragCents: cents, kategorie, titel: titel.trim(), beschreibung: beschreibung.trim() };
    try {
      if (editing) await api.patch(`/budget/${item!.id}`, payload);
      else await api.post("/budget", payload);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/budget/${item!.id}`);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Budgetposten bearbeiten" : "Budgetposten (Schätzung)"}
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
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Zelt-Miete" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Betrag (CHF)</label>
            <input className="input" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Kostenstelle</label>
            <select className="input" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notiz (optional)</label>
          <input className="input" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="z. B. inkl. Auf-/Abbau, Schätzung" />
        </div>
        <p className="text-xs text-stone-400">Tipp: Gagen der Acts erscheinen automatisch – die trägst du direkt beim Act ein.</p>
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
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving || uploading}>
            Speichern
          </button>
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
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Beschreibung</label>
          <input className="input" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Wofür? z. B. Farbe & Pinsel" />
        </div>

        {/* Beleg (optional) */}
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
