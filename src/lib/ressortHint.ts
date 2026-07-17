import type { RessortSummary } from "@/lib/uiTypes";

// Kurzer Stichwort-Hinweis, was ein Ressort beinhaltet (für die Übersicht).
export function ressortHint(r: Pick<RessortSummary, "name" | "hatZeitplan" | "hatActs" | "hatFinanzen">): string {
  if (r.hatActs) return "Bands & DJs · Rider, Gagen, Übernachtung";
  if (r.hatFinanzen) return "Ausgaben, Budget & Belege hochladen";
  if (r.hatZeitplan) return "Line-up & Öffnungszeiten Bars";
  const n = r.name.toLowerCase();
  if (/essen|food|küche/.test(n)) return "Menü, Abendessen & Küche";
  if (/getränk|bar|drink/.test(n)) return "Bar, Getränke & Ausschank";
  if (/technik|ton|licht|strom/.test(n)) return "Ton, Licht & Strom";
  if (/promo|werbung|social/.test(n)) return "Werbung, Social Media & Plakate";
  if (/deko/.test(n)) return "Dekoration der Floors & WGs";
  if (/sicher|awareness|sani/.test(n)) return "Awareness, Sanität & Sicherheitskonzept";
  return "";
}
