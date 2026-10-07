#!/usr/bin/env bash
# Start a local PostgreSQL for development.
# Prefers Docker Compose; falls back to the system PostgreSQL service (e.g. in CI containers).
set -euo pipefail
cmd="${1:-start}"
DB_USER="${DB_USER:-bt}"; DB_PASS="${DB_PASS:-bt}"; DB_NAME="${DB_NAME:-bt_commerce}"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  case "$cmd" in
    start) docker compose up -d db ;;
    stop) docker compose stop db ;;
  esac
  exit 0
fi

case "$cmd" in
  start)
    (service postgresql start || pg_ctlcluster 16 main start) >/dev/null 2>&1 || true
    for _ in $(seq 1 20); do pg_isready -q -h localhost && break; sleep 0.5; done
    as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$1"; else sudo -u postgres bash -c "$1"; fi; }
    as_pg "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'\" | grep -q 1 || psql -c \"CREATE ROLE $DB_USER LOGIN SUPERUSER PASSWORD '$DB_PASS'\""
    as_pg "psql -tc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\" | grep -q 1 || createdb -O $DB_USER $DB_NAME"
    as_pg "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}_test'\" | grep -q 1 || createdb -O $DB_USER ${DB_NAME}_test"
    echo "PostgreSQL ready: postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
    ;;
  stop) service postgresql stop ;;
esac
