import type { TodoStatus, Verfuegbarkeit } from "./uiTypes";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseTs(ts: string): Date {
  return new Date(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z");
}

export function relTime(ts: string | null): string {
  if (!ts) return "—";
  const d = parseTs(ts);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `vor ${days} Tg.`;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function formatDateLong(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export const STATUS_LABEL: Record<TodoStatus, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
};

export const STATUS_CLASSES: Record<TodoStatus, string> = {
  offen: "bg-slate-100 text-slate-600",
  in_arbeit: "bg-amber-100 text-amber-700",
  erledigt: "bg-emerald-100 text-emerald-700",
};

export const VOTE_LABEL: Record<Verfuegbarkeit, string> = {
  ja: "Ja",
  vielleicht: "Vielleicht",
  nein: "Nein",
};

export const VOTE_CLASSES: Record<Verfuegbarkeit, string> = {
  ja: "bg-emerald-500 text-white",
  vielleicht: "bg-amber-400 text-white",
  nein: "bg-red-400 text-white",
};

export function isOverdue(fristDatum: string | null, status: TodoStatus): boolean {
  if (!fristDatum || status === "erledigt") return false;
  const d = new Date(fristDatum + "T23:59:59");
  return d.getTime() < Date.now();
}
