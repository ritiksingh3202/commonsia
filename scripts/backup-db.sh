#!/usr/bin/env bash
# Commonsia — on-demand database backup (Linux/macOS/WSL)
#
# Runs pg_dump against DIRECT_URL (Supabase transaction-pooler URL breaks utility commands)
# and writes a gzipped custom-format dump to `backups/YYYY-MM-DD_HHmm.dump.gz`.
#
# Prereqs:
#   - PostgreSQL client tools (>= 15). macOS: `brew install libpq && brew link --force libpq`.
#     Ubuntu/Debian: `sudo apt install postgresql-client-15`.
#   - Your `.env` already holds DIRECT_URL.
#
# Usage (from repo root):
#   ./scripts/backup-db.sh

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$REPO_ROOT/backups"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at $ENV_FILE" >&2
  exit 1
fi

DIRECT_URL="$(grep -E '^\s*DIRECT_URL\s*=' "$ENV_FILE" | head -n 1 | sed -E 's/^\s*DIRECT_URL\s*=\s*"?([^"]+)"?\s*$/\1/')"

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "ERROR: DIRECT_URL missing in .env. Paste the Supabase 'Direct connection' URL." >&2
  exit 1
fi

CONN_STR="${DIRECT_URL%%\?*}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not on PATH. Install Postgres 15+ client tools." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y-%m-%d_%H%M)"
DUMP="$BACKUP_DIR/$TS.dump"

echo "Running pg_dump against Supabase..."
pg_dump --format=custom --no-owner --no-privileges --verbose --file="$DUMP" "$CONN_STR"

echo "Compressing dump..."
gzip --best "$DUMP"
SIZE="$(du -h "$DUMP.gz" | cut -f1)"
echo "Backup complete: $DUMP.gz ($SIZE)"
echo "Restore with: ./scripts/restore-db.sh $DUMP.gz"
