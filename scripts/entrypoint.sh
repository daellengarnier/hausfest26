#!/bin/sh
set -e

# Migrationen idempotent anwenden, dann App starten. DB beim ersten
# Versuch evtl. noch nicht erreichbar — ein paar Mal retryen.
attempts=0
until node /app/scripts/migrate.mjs; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 10 ]; then
    echo "[entrypoint] Migration nach $attempts Versuchen fehlgeschlagen."
    exit 1
  fi
  echo "[entrypoint] Migration noch nicht möglich, warte 2 s (Versuch $attempts/10)…"
  sleep 2
done

# Seed-Daten beim ersten Start anlegen (idempotent: überspringt bei vorhandenen Nutzern).
if [ "${SEED_ON_START:-true}" != "false" ]; then
  node /app/scripts/seed.mjs || echo "[entrypoint] Seed übersprungen/fehlgeschlagen (nicht kritisch)."
fi

exec "$@"
