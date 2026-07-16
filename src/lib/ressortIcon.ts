// Ordnet Ressorts ein passendes Emoji zu (nur Deko, rein optisch).
const ICONS: { match: RegExp; icon: string }[] = [
  { match: /programm|line.?up|musik|dj/i, icon: "🎧" },
  { match: /essen|food|grill|küche/i, icon: "🍔" },
  { match: /getränk|bar|drink/i, icon: "🍹" },
  { match: /technik|ton|licht|strom/i, icon: "🎛️" },
  { match: /promo|werbung|social/i, icon: "📣" },
  { match: /deko|dekor/i, icon: "🎨" },
  { match: /sicher|awareness|sani/i, icon: "🛟" },
  { match: /finanz|budget|geld|kasse/i, icon: "💰" },
  { match: /bau|technik|hand/i, icon: "🔧" },
];

export function ressortIcon(name: string): string {
  for (const { match, icon } of ICONS) if (match.test(name)) return icon;
  return "🎪";
}
