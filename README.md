# Hausfest 26 – Orga

Kollaborative, mobile-first **Orga-App** (PWA) für das Hausfest der Spinnerei.
Vorbild: Basecamp – schlank, auf eine Festorganisation zugeschnitten.

> Ressort → (optional) Sub-Ressort → Todo → Diskussion. Dazu Sitzungen
> (Doodle-Verfügbarkeit + Protokoll) und eine In-App-Inbox als Push-Ersatz.

## Stack

- **Next.js 16** (App Router, Standalone Output) + **React 19**
- **Tailwind CSS v4**
- **Postgres 16** + **Drizzle ORM**
- **Docker** + **GitHub Actions** für Auto-Deploy
- Reverse-Proxy: **Caddy** (zentral im `ambardaellen-app`-Stack auf demselben VPS)
- Auth: HttpOnly-Cookie-Sessions, Passwörter mit **bcrypt** gehasht
- „Echtzeit": Polling (Inbox-Badge) – bewusst keine WebSockets im MVP
- Installierbare **PWA** (Manifest, Icons, Service-Worker/Offline-Shell)

## Live

https://hausfest.al-daellen.ch

## Funktionen

- **Login** + erzwungener Passwortwechsel beim ersten Anmelden
- **Dashboard**: alle Ressorts mit offenen Todos, nächster Sitzung, letzter Aktivität
- **Ressort-Ansicht**: Sub-Ressorts (auf-/zuklappbar), Todos, eigene Pinnwand
- **Programm-Zeitplan**: visuelle Timeline 16:00–08:00 mit mehreren Floors,
  Acts per Uhrzeit einzeichnen (nur bei Ressorts mit aktiviertem Zeitplan)
- **Todo-Detail**: Status, Zuständige, Frist, Diskussion mit `@Mention`-Autocomplete
- **Meine Sachen**: mir zugewiesen + @mich erwähnt
- **Inbox**: Mentions, Zuweisungen, neue Kommentare, Sitzungseinladungen
- **Sitzungen**: Doodle-Verfügbarkeit (ja/vielleicht/nein), Termin fixieren,
  Protokoll (Markdown, Autosave) + Markdown-Export
- **Admin**: Accounts (anlegen, Rolle, deaktivieren, Passwort-Reset) und Ressorts

## Lokal entwickeln

Voraussetzung: Node 22, lokale Postgres-Instanz.

```bash
npm install
# .env mit DATABASE_URL anlegen, z. B.:
#   DATABASE_URL=postgres://postgres@localhost:5432/hausfest26
npm run db:migrate     # Schema anlegen (drizzle-kit migrate)
npm run db:seed        # Ressort-Struktur befüllen (idempotent, keine User)
npm run dev            # http://localhost:3000
```

### Registrierung & erste Anmeldung

Es gibt **keine vorgefertigten Accounts**: Jede:r **registriert sich selbst**
mit eigener E-Mail + Passwort (`/register`) und meldet sich danach an.

- Der **erste registrierte Account wird automatisch Admin** (Bootstrap).
- Zusätzlich können über `ADMIN_EMAILS` (kommagetrennt) bestimmte E-Mails beim
  Registrieren direkt Admin werden.
- Optional lässt sich die Registrierung mit `REGISTRATION_CODE` (gemeinsamer
  Einladungscode) absichern – sinnvoll, da die App öffentlich erreichbar ist.

Die Ressort-Struktur ist vorbefüllt; **Leads** vergibt der Admin nach der
Registrierung im Admin-Bereich.

## Deploy

Push auf `main` → GitHub Actions baut das Image → SSH zum VPS →
`docker compose pull && up -d`. Beim Container-Start laufen über
`scripts/entrypoint.sh` automatisch:

1. **Migrationen** (`scripts/migrate.mjs`)
2. **Seed** (`scripts/seed.mjs`, idempotent – nur bei leerer DB)

### Relevante Umgebungsvariablen

| Variable | Default | Beschreibung |
|---|---|---|
| `DATABASE_URL` | – | Postgres-Verbindung (Pflicht) |
| `SEED_ON_START` | `true` | Ressort-Seed beim Start ausführen (überspringt, wenn Ressorts existieren) |
| `SESSION_TTL_DAYS` | `30` | Gültigkeit „angemeldet bleiben" |
| `COOKIE_SECURE` | `auto` | `true` erzwingt Secure-Cookies (in Prod automatisch an) |
| `ADMIN_EMAILS` | – | Kommagetrennte E-Mails, die bei Registrierung Admin werden |
| `REGISTRATION_CODE` | – | Falls gesetzt, ist dieser Einladungscode zum Registrieren nötig |

## Schema-Änderungen

1. `src/lib/db/schema.ts` editieren
2. `npm run db:generate` → erzeugt neue Migration in `drizzle/`
3. Committen & pushen → wird beim Deploy automatisch migriert

## Was bewusst NICHT im MVP ist

Echtzeit-Live-Chat, OS-Push, allgemeine Datei-Uploads, Kalender-Sync,
Budget-/Finanztabellen. (Siehe Anforderungsprofil, Abschnitt 9.)
