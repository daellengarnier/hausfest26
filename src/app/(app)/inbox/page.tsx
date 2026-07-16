"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Spinner } from "@/components/Ui";
import { Icon, type IconName } from "@/components/Icon";
import { relTime } from "@/lib/uiUtil";
import type { ActivityItem } from "@/lib/uiTypes";

const ICON: Record<string, IconName> = {
  mention: "chat",
  zuweisung: "check",
  neuer_kommentar: "chat",
  sitzung: "calendar",
};

function targetPath(it: ActivityItem): string {
  if (it.refTyp === "todo") return `/todo/${it.refId}`;
  if (it.refTyp === "ressort") return `/ressort/${it.refId}`;
  if (it.refTyp === "meeting") return `/meetings/${it.refId}`;
  return "/";
}

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  const load = () => api.get<{ items: ActivityItem[] }>("/activity").then((d) => setItems(d.items));

  useEffect(() => {
    load();
  }, []);

  const open = async (it: ActivityItem) => {
    if (!it.gelesen) {
      await api.post(`/activity/${it.id}/read`);
      window.dispatchEvent(new Event("hausfest:refresh-inbox"));
    }
    router.push(targetPath(it));
  };

  const markAll = async () => {
    await api.post("/activity/read-all");
    window.dispatchEvent(new Event("hausfest:refresh-inbox"));
    load();
  };

  const unread = (items ?? []).filter((i) => !i.gelesen).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Inbox</h1>
        {unread > 0 && (
          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={markAll}>
            Alle gelesen
          </button>
        )}
      </div>

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="🔔" title="Alles ruhig" hint="Hier landen Erwähnungen, Zuweisungen, neue Kommentare und Sitzungen." />
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => open(it)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left active:bg-slate-50 ${it.gelesen ? "" : "bg-accent/5"}`}
            >
              <span className="relative mt-0.5">
                {it.actorName ? (
                  <Avatar name={it.actorName} color={it.actorColor ?? "#94a3b8"} size={36} />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-500">
                    <Icon name={ICON[it.typ] ?? "bell"} size={18} />
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-white ring-2 ring-white">
                  <Icon name={ICON[it.typ] ?? "bell"} size={10} strokeWidth={2.2} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-stone-700">{it.text}</span>
                <span className="text-xs text-stone-400">{relTime(it.createdAt)}</span>
              </span>
              {!it.gelesen && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
