# Hausfest 26 — Design-Brief

Alles, was du (oder Claude) brauchst, um das Design der App neu zu gestalten.
Paste diese Datei zusammen mit `aktueller-stand.html` in eine Claude-Unterhaltung
und sag z. B.: *„Hier ist meine App und der Design-Brief. Entwirf mir ein
frisches, schöneres Design – halte dich an die Vorgaben unter ‚Feste Regeln'."*

---

## 1. Worum geht's

Eine **kollaborative, mobile-first PWA** für die Organisation des Hausfests der
Spinnerei. Kein Marketing-Auftritt, sondern ein **internes Orga-Tool** für das
Team: Ressorts, Todos, Line-up, Finanzen, Einkaufsliste, Sitzungen, Inbox.

- **Anlass:** *33 Jahre Via · 10 Jahre Spinnerei*
- **Publikum:** das Orga-Team (Kolleg:innen), Handy zuerst, oft unterwegs.
- **Ton:** warm, natürlich, unkompliziert, ein bisschen handgemacht/kollektiv –
  nicht Corporate, nicht verspielt-kindlich.

## 2. Feste Regeln (bitte einhalten)

Diese Punkte sind über viele Iterationen entstanden und sollen bleiben:

1. **Warm, naturnah, grün-erdig.** Salbei-/Waldgrün als Leitfarbe, Terrakotta als
   Zweitakzent, sandig-warme Neutraltöne. **Gradients sind erlaubt** und erwünscht.
2. **KEINE Emojis.** Stattdessen **eigene, schlichte Linien-SVG-Icons** im
   gleichen ruhigen Stil (abgerundete Linien, `currentColor`). Icon-Set siehe §6.
3. **Marken-Zeichen = stehendes Dreieck** (Pyramide) auf grünem Grund. Ist Favicon,
   App-Icon und Header-Logo. Darf grösser/prominenter, aber Form bleibt.
4. **Mobile-first.** Alles muss auf schmalen Screens funktionieren; max. Breite
   ~ 42rem (`max-w-2xl`), zentriert. Untere Tab-Bar + oben ein Glas-Header.
5. **Responsiv.** Nichts darf horizontal aus dem Bild laufen (v. a. die Line-up-
   Timeline passt ihre Spaltenbreite an).
6. **Ganze App gleiche Sprache:** Deutsch (Schweizer Schreibweise, „ss" statt „ß"
   ist okay; aktuell teils gemischt).

## 3. Farben & Tokens (aktueller Stand)

Startpalette – darf verfeinert werden, soll aber im warm-grünen Feld bleiben.

| Rolle | Wert |
|---|---|
| Akzent (Waldgrün) | `#4b7f52` |
| Akzent dunkel | `#35603c` |
| Akzent hell | `#cfe0cf` |
| Terrakotta (2. Akzent) | `#c2703d` |
| Terrakotta hell | `#eccdb6` |
| Ink (Text, warmes Dunkelbraun) | `#2c261d` |
| Mute (Sekundärtext) | `#857c6b` |

**Marken-Gradient:** `linear-gradient(135deg, #6aa86f 0%, #4b7f52 55%, #35603c 100%)`

**App-Hintergrund** (grünlich-warmes „Papier" mit weichen Verläufen):
`#e7eed9` + mehrere radiale Grün-/Oliv-/Terra-Verläufe (siehe HTML).

**Auth-Hintergrund** (Login/Register, dunkel): `#33472f` + Verläufe.

**Schatten:**
- soft: `0 1px 2px rgba(60,46,24,.05), 0 14px 30px -16px rgba(60,46,24,.22)`
- pop (Buttons): `0 10px 26px -12px rgba(75,127,82,.55)`

**Kostenstellen-Farben (Finanzen):** Essen `#c2703d`, Getränke `#0e8ba3`,
Gagen `#8a3ea8`, Deko `#4b7f52`, Materialmiete `#7a8f3f`, Sonstiges `#8a8172`.

## 4. Typografie

- Font-Stack: `ui-rounded, "Segoe UI Rounded", ui-sans-serif, system-ui,
  -apple-system, "Segoe UI", Roboto, sans-serif` — bewusst **leicht abgerundet**.
- Titel kräftig (`font-extrabold`, engeres Tracking). „Hausfest 26" nutzt einen
  grünen Text-Gradient (`.brand-text`).

## 5. Bausteine (Component-Inventar)

- **Card:** weiss, `rounded-2xl`, feiner Ring `ring-stone-900/5`, soft-Schatten.
- **Buttons:** Pillen (`rounded-full`). `primary` = Marken-Gradient + weisser Text
  + pop-Schatten. `ghost` = `stone-100` mit Ring. `danger` = rot, dezent.
- **Input/Select:** `rounded-xl`, weisser Grund, `stone-300`-Rand, grüner Fokusring.
- **Chip:** kleine Pille, `text-xs font-semibold`.
- **Avatar:** runder Kreis mit Initialen auf Farbe – ODER hochgeladenes Profilbild.
  Antippen zeigt kurz den ganzen Namen (Pille unten). Stapel („AvatarStack") für
  mehrere.
- **Header (Glas):** sticky oben; links Dreieck-Logo + „Hausfest 26" mit Untertitel
  „33 Jahre Via · 10 Jahre Spinnerei"; rechts Glocke (Inbox, mit Zähler) + Avatar-Menü.
- **Tab-Bar (unten, Glas):** 3 Tabs — Übersicht (home), Meine Sachen (tasks),
  Einkauf (cart). Aktiver Tab grün hinterlegt.
- **Line-up-Timeline:** vertikale Zeitachse (16:00 → 08:00), Floors als farbige
  Spalten, Einträge als farbige Blöcke, dezentes „Nachtessen"-Band über alle Spalten.
- **Kostenstellen-Balken:** Fortschrittsbalken Ist/Plan pro Kategorie (grün, rot
  bei Überschreitung).

## 6. Icon-Set (eigene SVG, KEINE Emojis)

Alle Icons: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
`stroke-width` ~1.75, runde Enden. Vorhandene Namen:

`home, tasks, bell, ticket, chevron, plus, close, trash, back, check, calendar,
chat, pencil, user, logout, key, gear, copy, external, download, leaf, music,
food, drink, tools, megaphone, palette, shield, coins, tent, clock, send, bed,
file, star, cart`

(Die exakten SVG-Pfade stehen im Repo unter `src/components/Icon.tsx` und sind
auch im HTML-Mockup eingebettet.)

## 7. Screens (die das Design abdecken muss)

1. **Login / Registrierung** (dunkler Auth-Hintergrund). Registrierung mit
   **Namensauswahl** (vorbereitete Profile) + Anleitung „App auf Homebildschirm".
2. **Übersicht** (Startseite): Begrüssung „Hallo, <Name>" (gross, ohne Box),
   Buttons **Tickets** + **Schichtplan**, Ticket-Passwort dezent, dann die
   **Ressort-Liste** (Icon + Name + kurzer Stichwort-Hinweis + offene Todos).
3. **Ressort-Detail:** Kopf (Titel + farbiger Punkt + Leads, ohne Box) und
   Tab-Leiste. Tabs je nach Ressort: *Ausgaben, Line-up, Öffnungszeiten Bars,
   Acts, Todos, Pinnwand*.
4. **Line-up** & **Öffnungszeiten Bars:** die Timeline (siehe §5).
5. **Acts:** Karten pro Band/DJ (Typ, Gage, Übernachtung, Rider-Dateien).
6. **Finanzen (Kosten-Übersicht):** grosse Karte mit Ausgegeben (Ist) / Budget
   (Plan) / Rest + Balken; darunter **Kostenstellen** (aufklappbar, Ist/Plan-Balken);
   „Ausgelegt nach Person"; Defizitgarantie dezent.
7. **Einkaufsliste:** je Ressort/Sub-Ressort aufklappbar, Artikel abhaken.
8. **Inbox** (Benachrichtigungen), **Sitzungen** (Doodle + Protokoll), **Admin**.

## 8. Was NICHT verändert werden soll

- Der **funktionale Aufbau** (Ressorts→Tabs, Timeline-Logik, Finanzen-Modell).
- Feste Inhalte: Event-Titel/Untertitel, Ticket-Passwort `viaspinnerei`,
  Tickets- & Schichtplan-Links.
- Die Regeln aus §2 (grün-warm, keine Emojis, Dreieck, mobile-first, responsiv).

## 9. So arbeitest du in Claude

1. Neue Claude-Unterhaltung öffnen.
2. Diese Datei + `aktueller-stand.html` anhängen (oder Inhalt einfügen).
3. Bitten, z. B.: *„Redesign als Artifact, gleiche Screens & Inhalte, aber
   frischer/edler. Halte dich strikt an die ‚Feste Regeln'. Zeig mir 2 Varianten."*
4. Wenn dir eine Variante gefällt: die neuen Farben/Abstände/Bausteine hierher
   zurückgeben — dann setze ich sie in der echten App um (Tailwind-Theme +
   Komponenten).
