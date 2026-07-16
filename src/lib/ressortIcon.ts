import type { IconName } from "@/components/Icon";

// Ordnet Ressorts ein passendes SVG-Icon zu (kein Emoji).
const MAP: { match: RegExp; icon: IconName }[] = [
  { match: /programm|line.?up|musik|dj/i, icon: "music" },
  { match: /essen|food|grill|küche/i, icon: "food" },
  { match: /getränk|bar|drink/i, icon: "drink" },
  { match: /technik|ton|licht|strom|bau/i, icon: "tools" },
  { match: /promo|werbung|social/i, icon: "megaphone" },
  { match: /deko|dekor/i, icon: "palette" },
  { match: /sicher|awareness|sani/i, icon: "shield" },
  { match: /finanz|budget|geld|kasse/i, icon: "coins" },
];

export function ressortIcon(name: string): IconName {
  for (const { match, icon } of MAP) if (match.test(name)) return icon;
  return "tent";
}
