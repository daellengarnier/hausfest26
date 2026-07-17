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
  const [view, setView] = useState<"ausgaben" | "budget">("ausgaben");
  const [expModal, setExpModal] = useState<Expense | "new" | null>(null);
  const [budModal, setBudModal] = useState<BudgetItem | "new" | null>(null);
  const [filter, setFilter] = useState<string>("");

  const loadExpenses = () => api.get<{ expenses: Expense[] }>(`/expenses?ressortId=${ressortId}`).then((d) => setExpenses(d.expenses));
  const loadBudget = () => api.get<{ budget: BudgetItem[] }>(`/budget?ressortId=${ressortId}`).then((d) => setBudget(d.budget));
  useEffect(() => {
    loadExpenses();
    loadBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  const { mineCents, totalCents, byCat, byUser } = useMemo(() => {
    const list = expenses ?? [];
    let mine = 0,
      total = 0;
    const cat = new Map<string, number>();
    const usr = new Map<number, { name: string; color: string; cents: number }>();
    for (const e of list) {
      total += e.betragCents;
      if (e.userId === user?.id) mine += e.betragCents;
      cat.set(e.kategorie, (cat.get(e.kategorie) ?? 0) + e.betragCents);
      if (e.userId != null) {
        const cur = usr.get(e.userId) ?? { name: e.userName ?? "?", color: e.userColor ?? "#8a8172", cents: 0 };
        cur.cents += e.betragCents;
        usr.set(e.userId, cur);
      }
    }
    return {
      mineCents: mine,
      totalCents: total,
      byCat: [...cat.entries()].sort((a, b) => b[1] - a[1]),
      byUser: [...usr.values()].sort((a, b) => b.cents - a.cents),
    };
  }, [expenses, user]);

  // Plan (Budget) vs. Ist (Ausgaben) je Bereich.
  const { planTotal, planVsIst } = useMemo(() => {
    const plan = new Map<string, number>();
    for (const b of budget ?? []) plan.set(b.kategorie, (plan.get(b.kategorie) ?? 0) + b.betragCents);
    const istMap = new Map(byCat);
    let planSum = 0;
    for (const v of plan.values()) planSum += v;
    const keys = new Set<string>([...plan.keys(), ...istMap.keys()]);
    const rows = [...keys]
      .map((k) => ({ kategorie: k, plan: plan.get(k) ?? 0, ist: istMap.get(k) ?? 0 }))
      .sort((a, b) => Math.max(b.plan, b.ist) - Math.max(a.plan, a.ist));
    return { planTotal: planSum, planVsIst: rows };
  }, [budget, byCat]);

  const restCents = planTotal - totalCents;
  const shown = (expenses ?? []).filter((e) => !filter || e.kategorie === filter);
  const loading = expenses === null || budget === null;

  return (
    <div className="space-y-4">
      {/* Budget-Übersicht: Plan vs. Ist */}
      <div className="card overflow-hidden">
        <div className="brand-gradient px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Budget-Übersicht</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-white/70">Ausgegeben (Ist)</p>
              <p className="text-3xl font-extrabold leading-tight">CHF {formatChf(totalCents)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70">Budget (Plan)</p>
              <p className="text-lg font-bold leading-tight">CHF {formatChf(planTotal)}</p>
            </div>
          </div>
          {planTotal > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white/90"
                  style={{ width: `${Math.min(100, planTotal ? (totalCents / planTotal) * 100 : 0)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/85">
                {restCents >= 0 ? `Noch CHF ${formatChf(restCents)} im Budget` : `CHF ${formatChf(-restCents)} über Budget`}
              </p>
            </div>
          )}
          <p className="mt-2 text-xs text-white/75">Meine Ausgaben: CHF {formatChf(mineCents)}</p>
        </div>
      </div>

      {loading ? (
        <Spinner label="Lade Finanzen …" />
      ) : (
        <>
          {/* Plan vs. Ist je Bereich */}
          {planVsIst.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-bold text-stone-500">Plan vs. Ist je Bereich</h3>
              <div className="space-y-3">
                {planVsIst.map((r) => {
                  const color = CATEGORY_COLOR[r.kategorie] ?? "#8a8172";
                  const over = r.plan > 0 && r.ist > r.plan;
                  const noPlan = r.plan === 0 && r.ist > 0;
                  const pct = r.plan > 0 ? Math.min(100, (r.ist / r.plan) * 100) : r.ist > 0 ? 100 : 0;
                  return (
                    <div key={r.kategorie}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="flex-1 truncate text-stone-700">{r.kategorie}</span>
                        <span className="tabular-nums font-semibold text-ink">CHF {formatChf(r.ist)}</span>
                        <span className="tabular-nums text-xs text-stone-400">/ {r.plan > 0 ? formatChf(r.plan) : "–"}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: over || noPlan ? "#c2453d" : color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Umschalter Ausgaben / Budget */}
          <div className="flex rounded-xl bg-stone-100 p-1 text-sm font-semibold">
            <button
              className={`flex-1 rounded-lg py-1.5 ${view === "ausgaben" ? "bg-white text-ink shadow-sm" : "text-stone-500"}`}
              onClick={() => setView("ausgaben")}
            >
              Ausgaben
            </button>
            <button
              className={`flex-1 rounded-lg py-1.5 ${view === "budget" ? "bg-white text-ink shadow-sm" : "text-stone-500"}`}
              onClick={() => setView("budget")}
            >
              Budget
            </button>
          </div>

          {view === "ausgaben" ? (
            <>
              <button className="btn-primary w-full" onClick={() => setExpModal("new")}>
                <Icon name="plus" size={17} /> Ausgabe erfassen
              </button>

              {/* Aufteilung nach Person */}
              {byUser.length > 1 && (
                <div className="card p-4">
                  <h3 className="mb-2 text-sm font-bold text-stone-500">Nach Person</h3>
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

              {filter && (
                <button className="text-xs font-medium text-accent-dark" onClick={() => setFilter("")}>
                  Filter &bdquo;{filter}&ldquo; aufheben
                </button>
              )}
              {shown.length === 0 ? (
                <EmptyState title="Noch keine Ausgaben" hint="Erfasse deine erste Ausgabe – Beleg fotografieren, Rest wird (mit KI) vorausgefüllt." />
              ) : (
                <div className="card divide-y divide-stone-100 overflow-hidden">
                  {shown.map((e) => {
                    const mine = e.userId === user?.id;
                    return (
                      <button key={e.id} onClick={() => setExpModal(e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-stone-50">
                        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[e.kategorie] ?? "#8a8172" }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{e.beschreibung || e.kategorie}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                            <span className="chip bg-stone-100 text-stone-600">{e.kategorie}</span>
                            {e.datum && <span>{formatDate(e.datum)}</span>}
                            {e.userName && <span>· {mine ? "du" : e.userName}</span>}
                            {e.belegId && <Icon name="ticket" size={13} className="text-stone-400" />}
                          </div>
                        </div>
                        <span className="shrink-0 font-bold text-ink">CHF {formatChf(e.betragCents)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <button className="btn-primary w-full" onClick={() => setBudModal("new")}>
                <Icon name="plus" size={17} /> Budgetposten hinzufügen
              </button>
              <p className="px-1 text-xs text-stone-500">
                Trage geschätzte Auslagen ein (z. B. erwartete Gagen, Materialkosten). So sieht jedes Ressort früh, was auf uns zukommt.
              </p>
              {(budget ?? []).length === 0 ? (
                <EmptyState title="Noch kein Budget geplant" hint="Erfasse geschätzte Kosten deines Bereichs – als Grundlage für die Gesamtplanung." />
              ) : (
                <div className="card divide-y divide-stone-100 overflow-hidden">
                  {(budget ?? []).map((b) => (
                    <button key={b.id} onClick={() => setBudModal(b)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-stone-50">
                      <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[b.kategorie] ?? "#8a8172" }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{b.titel || b.kategorie}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                          <span className="chip bg-stone-100 text-stone-600">{b.kategorie}</span>
                          {b.createdByName && <span>· {b.createdByName}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 font-bold text-stone-500">CHF {formatChf(b.betragCents)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
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
  const [kategorie, setKategorie] = useState(item?.kategorie ?? "Sonstiges");
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
      title={editing ? "Budgetposten bearbeiten" : "Budgetposten"}
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
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Gage Live-Band" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Betrag (CHF)</label>
            <input className="input" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Bereich</label>
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
          <input className="input" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="z. B. inkl. Reisespesen, Schätzung" />
        </div>
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
  const [kategorie, setKategorie] = useState(expense?.kategorie ?? "Sonstiges");
  const [beschreibung, setBeschreibung] = useState(expense?.beschreibung ?? "");
  const [datum, setDatum] = useState(expense?.datum ?? "");
  const [beleg, setBeleg] = useState<Attachment | null>(
    expense?.belegId ? { id: expense.belegId, filename: expense.belegFilename ?? "Beleg", mime: expense.belegMime ?? "", size: 0 } : null,
  );
  const [uploading, setUploading] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    setUploading(true);
    setScanNote("");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/attachments", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload fehlgeschlagen");
      const { attachment } = (await res.json()) as { attachment: Attachment };
      setBeleg(attachment);
      // KI-Auslesen versuchen
      setScanNote("Beleg wird gelesen …");
      const scan = await api
        .post<{ available: boolean; betragCents?: number; datum?: string; kategorie?: string; haendler?: string; error?: string }>(
          "/expenses/scan",
          { attachmentId: attachment.id },
        )
        .catch(() => null);
      if (!scan || scan.available === false) {
        setScanNote("");
      } else if (scan.error) {
        setScanNote("KI konnte den Beleg nicht sicher lesen – bitte manuell prüfen.");
      } else {
        if (scan.betragCents) setBetrag((scan.betragCents / 100).toFixed(2));
        if (scan.datum) setDatum(scan.datum);
        if (scan.kategorie) setKategorie(scan.kategorie);
        setScanNote(`Erkannt${scan.haendler ? " (" + scan.haendler + ")" : ""} – bitte prüfen.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const cents = parseChf(betrag);
    if (!Number.isFinite(cents) || cents <= 0) return setError("Bitte einen gültigen Betrag angeben");
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
        {/* Beleg */}
        <div>
          <label className="label">Beleg (Foto/PDF, optional)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {beleg ? (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
              <Icon name="ticket" size={16} className="text-accent" />
              <a href={`/api/attachments/${beleg.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-accent-dark">
                {beleg.filename}
              </a>
              <button className="text-stone-400 hover:text-red-500" onClick={() => setBeleg(null)} aria-label="Beleg entfernen">
                <Icon name="close" size={15} />
              </button>
            </div>
          ) : (
            <button className="btn-ghost w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Icon name="download" size={16} className="rotate-180" /> {uploading ? "Lädt …" : "Beleg hochladen"}
            </button>
          )}
          {scanNote && <p className="mt-1 text-xs text-accent-dark">{scanNote}</p>}
        </div>

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
          <label className="label">Kategorie</label>
          <select className="input" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <input className="input" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="z. B. Farbe & Pinsel" />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
