"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { Spinner, EmptyState } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import type { ShoppingGroup, ShoppingItem } from "@/lib/uiTypes";

export default function EinkaufPage() {
  const [groups, setGroups] = useState<ShoppingGroup[] | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const load = () => api.get<{ ressorts: ShoppingGroup[] }>("/shopping").then((d) => setGroups(d.ressorts));
  useEffect(() => {
    load();
  }, []);

  const totalOffen = (groups ?? []).reduce((s, g) => s + g.items.filter((i) => !i.erledigt).length, 0);

  return (
    <div className="space-y-4">
      <div className="px-1 pt-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Einkaufsliste</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {totalOffen > 0 ? `${totalOffen} Artikel offen – pro Ressort & Sub-Ressort` : "Artikel je Ressort & Sub-Ressort erfassen"}
        </p>
      </div>

      {groups === null ? (
        <Spinner label="Lade Einkaufsliste …" />
      ) : groups.length === 0 ? (
        <EmptyState title="Keine Ressorts" hint="Sobald Ressorts existieren, kannst du hier einkaufen." />
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const offen = g.items.filter((i) => !i.erledigt).length;
            const isOpen = open[g.id];
            return (
              <div key={g.id} className="card overflow-hidden">
                <button className="flex w-full items-center gap-2.5 px-3 py-3 text-left" onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}>
                  <Icon name="chevron" size={16} className={`shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.farbe }} />
                  <span className="flex-1 truncate font-semibold text-ink">{g.name}</span>
                  {offen > 0 ? (
                    <span className="chip shrink-0" style={{ background: `${g.farbe}1c`, color: g.farbe }}>
                      {offen}
                    </span>
                  ) : (
                    g.items.length > 0 && <Icon name="check" size={16} className="shrink-0 text-accent" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-stone-100">
                    <Section groupId={g.id} subId={null} label="Allgemein" items={g.items.filter((i) => i.subRessortId === null)} onChanged={load} />
                    {g.subRessorts.map((s) => (
                      <Section key={s.id} groupId={g.id} subId={s.id} label={s.name} items={g.items.filter((i) => i.subRessortId === s.id)} onChanged={load} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({
  groupId,
  subId,
  label,
  items,
  onChanged,
}: {
  groupId: number;
  subId: number | null;
  label: string;
  items: ShoppingItem[];
  onChanged: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!titel.trim() || busy) return;
    setBusy(true);
    try {
      await api.post("/shopping", { ressortId: groupId, subRessortId: subId, titel: titel.trim() });
      setTitel("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  // "Allgemein" nur zeigen, wenn Artikel vorhanden – oder immer als Fallback? Immer, damit man erfassen kann.
  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <p className="px-3 pt-2.5 text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <div className="px-1 py-1">
        {items.map((it) => (
          <ItemRow key={it.id} item={it} onChanged={onChanged} />
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 pb-3">
        <input
          className="input flex-1 py-2 text-sm"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Artikel hinzufügen …"
        />
        <button className="btn-primary shrink-0 px-3 py-2" onClick={add} disabled={busy || !titel.trim()} aria-label="Hinzufügen">
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}

function ItemRow({ item, onChanged }: { item: ShoppingItem; onChanged: () => void }) {
  const toggle = async () => {
    await api.patch(`/shopping/${item.id}`, { erledigt: !item.erledigt });
    onChanged();
  };
  const remove = async () => {
    await api.del(`/shopping/${item.id}`);
    onChanged();
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 active:bg-stone-50">
      <button onClick={toggle} className="shrink-0" aria-label={item.erledigt ? "Als offen markieren" : "Als erledigt markieren"}>
        <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${item.erledigt ? "border-accent bg-accent text-white" : "border-stone-300 text-transparent"}`}>
          <Icon name="check" size={12} />
        </span>
      </button>
      <span className={`flex-1 truncate text-sm ${item.erledigt ? "text-stone-400 line-through" : "text-ink"}`}>
        {item.titel}
        {item.menge && <span className="ml-1.5 text-xs text-stone-400">{item.menge}</span>}
      </span>
      <button onClick={remove} className="shrink-0 rounded-lg p-1 text-stone-300 hover:bg-red-50 hover:text-red-500" aria-label="Löschen">
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}
