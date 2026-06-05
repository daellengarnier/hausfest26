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
npm run db:seed        # Accounts + Ressorts befüllen (idempotent)
npm run dev            # http://localhost:3000
```

### Erste Anmeldung

Seed-Accounts haben das Platzhalter-Passwort **`spinnfest`** (beim ersten Login
zu ändern). Admin: `alain@fest.felsenau.org`. Weitere Mitglieder:
`<name>@fest.felsenau.org` (z. B. `zoe@`, `baescht@`, `reto@`, `ambar@`,
`lucien@`, `daellen@`, `nando@`).

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
| `SEED_ON_START` | `true` | Seed beim Start ausführen (überspringt bei vorhandenen Nutzern) |
| `SEED_PASSWORD` | `spinnfest` | Platzhalter-Passwort der Seed-/neuen Accounts |
| `SESSION_TTL_DAYS` | `30` | Gültigkeit „angemeldet bleiben" |
| `COOKIE_SECURE` | `auto` | `true` erzwingt Secure-Cookies (in Prod automatisch an) |

## Schema-Änderungen

1. `src/lib/db/schema.ts` editieren
2. `npm run db:generate` → erzeugt neue Migration in `drizzle/`
3. Committen & pushen → wird beim Deploy automatisch migriert

## Was bewusst NICHT im MVP ist

Echtzeit-Live-Chat, OS-Push, allgemeine Datei-Uploads, Kalender-Sync,
Budget-/Finanztabellen. (Siehe Anforderungsprofil, Abschnitt 9.)
