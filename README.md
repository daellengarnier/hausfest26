# Hausfest 26

Next.js-App für das Hausfest 2026.

## Stack

- **Next.js 16** (App Router, Standalone Output)
- **Tailwind CSS v4**
- **Postgres 16** + **Drizzle ORM**
- **Docker** + **GitHub Actions** für Auto-Deploy
- Reverse-Proxy: **Caddy** (zentral im `ambardaellen-app`-Stack auf demselben VPS)

## Live

https://hausfest.al-daellen.ch

## Lokal entwickeln

```bash
npm install
# Lokale .env mit DATABASE_URL anlegen (siehe .env.example)
npm run dev
```

## Deploy

Push auf `main` → GitHub Actions baut Image → SSH zum VPS → `docker compose pull && up -d`.
Migrationen laufen automatisch beim Start via `scripts/entrypoint.sh`.

## Schema-Änderungen

1. `src/lib/db/schema.ts` editieren
2. `npm run db:generate` → erzeugt neue Datei in `drizzle/`
3. Committen & pushen → wird beim Deploy automatisch migriert
