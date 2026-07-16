// Eigenes, schlichtes Linien-Icon-Set (statt Emojis). Naturnaher, ruhiger Stil:
// abgerundete Linien, currentColor. size steuert Kantenlänge in px.
import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "tasks"
  | "bell"
  | "ticket"
  | "chevron"
  | "plus"
  | "close"
  | "trash"
  | "back"
  | "check"
  | "calendar"
  | "chat"
  | "pencil"
  | "user"
  | "logout"
  | "key"
  | "gear"
  | "copy"
  | "external"
  | "download"
  | "leaf"
  | "music"
  | "food"
  | "drink"
  | "tools"
  | "megaphone"
  | "palette"
  | "shield"
  | "coins"
  | "tent"
  | "clock"
  | "send";

const P: Record<IconName, string> = {
  home: "M4 11.5 12 5l8 6.5M6 10v9h12v-9M10 19v-5h4v5",
  tasks: "M4 7h11M4 12h11M4 17h7M18.5 6l1.6 1.6L23 4.5",
  bell: "M6 16v-4a6 6 0 1 1 12 0v4l1.5 2h-15zM9.5 18a2.5 2.5 0 0 0 5 0",
  ticket: "M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v2a1.5 1.5 0 0 0 0 3v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2a1.5 1.5 0 0 0 0-3zM12 7v13",
  chevron: "M9 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  trash: "M5 7h14M10 7V5h4v2M6 7l1 12h10l1-12M10 11v5M14 11v5",
  back: "M15 6l-6 6 6 6",
  check: "M5 12.5 10 17l9-10",
  calendar: "M4 8h16M7 4v3M17 4v3M5 6h14v14H5zM8 12h3v3H8z",
  chat: "M5 5h14v10H9l-4 4z",
  pencil: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  user: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5.5 20a6.5 6.5 0 0 1 13 0",
  logout: "M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M9 12h11M17 9l3 3-3 3",
  key: "M14.5 4a5.5 5.5 0 1 0-3.4 10.2L11 16H9v2H7v2H4v-3l7.1-5.1A5.5 5.5 0 0 0 14.5 4M16 8h.01",
  gear: "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M19 12l1.8-1-1-1.8-2 .6-1.6-1.6.6-2-1.8-1-1 1.8h-2.2l-1-1.8-1.8 1 .6 2L5 9.8l-2-.6-1 1.8 1.8 1v2.2l-1.8 1 1 1.8 2-.6L6.6 19l-.6 2 1.8 1 1-1.8h2.2l1 1.8 1.8-1-.6-2 1.6-1.6 2 .6 1-1.8-1.8-1z",
  copy: "M9 9h9v11H9zM6 15H4V4h11v2",
  external: "M14 5h5v5M19 5l-8 8M12 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
  download: "M12 4v10M8 11l4 4 4-4M5 19h14",
  leaf: "M20 4C9 4 4 9 4 17c8 0 16-5 16-13M4 20C4 12 9 8 15 8",
  music: "M9 18V6l10-2v10M9 15a3 3 0 1 1-2-2.8M19 12a3 3 0 1 1-2-2.8",
  food: "M4 4v6a2 2 0 0 0 4 0V4M6 4v16M15 4c-1.5 1-2 3-2 5s1 3 2.5 3H16v8M16 4v9",
  drink: "M6 5h12l-2 8H8zM12 13v5M8.5 18h7M9 9h6",
  tools: "M14.5 6.5a3.5 3.5 0 0 0-4.8 4.3L4 16.5 7.5 20l5.7-5.7a3.5 3.5 0 0 0 4.3-4.8l-2.2 2.2-2-2z",
  megaphone: "M4 10v4l10 5V5zM4 12H3M14 8a4 4 0 0 1 0 8M7 15v3h3",
  palette: "M12 4a8 8 0 1 0 0 16c1.5 0 1.5-2 0-2s-1-2 .5-2H15a4 4 0 0 0 4-4c0-3.9-3.1-6-7-6M7.5 12h.01M10 8h.01M14 8h.01",
  shield: "M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6zM9 12l2 2 4-4",
  coins: "M9 8.5c0-1.4 2-2.5 4.5-2.5S18 7.1 18 8.5 16 11 13.5 11 9 9.9 9 8.5M9 8.5V15c0 1.4 2 2.5 4.5 2.5S18 16.4 18 15V8.5M6 11c-1.8.3-3 1.1-3 2 0 1.4 2 2.5 4.5 2.5.5 0 1 0 1.5-.1",
  tent: "M12 4 3 19h18zM12 4v15M12 11l-4 8M12 11l4 8",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8v4.5l3 2",
  send: "M4 12l16-7-7 16-2.5-6.5z",
};

const STROKE_2: IconName[] = ["home", "tasks", "bell"];

export function Icon({
  name,
  size = 20,
  strokeWidth,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? (STROKE_2.includes(name) ? 1.9 : 1.75)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}
