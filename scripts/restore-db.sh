#!/usr/bin/env bash
# Commonsia — restore a Supabase backup (Linux/macOS/WSL)
#
# DANGER: --clean --if-exists drops every table in `public` before recreating. Always restore
# into a fresh/dev Supabase project first, verify, then repeat against production.
#
# Usage (from repo root):
#   ./scripts/restore-db.sh ./backups/2026-04-21_0200.dump.gz
#
# Optional: override the target with a one-off URL instead of reading .env.
#   RESTORE_URL="postgresql://...:5432/postgres?sslmode=require" \
#     ./scripts/restore-db.sh ./backups/2026-04-21_0200.dump.gz

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-.dump.gz>" >&2
  exit 1
fi

DUMP="$1"
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$DUMP" ]]; then
  echo "ERROR: backup file not found: $DUMP" >&2
  exit 1
fi

TARGET_URL="${RESTORE_URL:-}"
if [[ -z "$TARGET_URL" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: .env not found and RESTORE_URL not set." >&2
    exit 1
  fi
  TARGET_URL="$(grep -E '^\s*DIRECT_URL\s*=' "$ENV_FILE" | head -n 1 | sed -E 's/^\s*DIRECT_URL\s*=\s*"?([^"]+)"?\s*$/\1/')"
fi

if [[ -z "$TARGET_URL" ]]; then
  echo "ERROR: No target URL. Set RESTORE_URL env var or add DIRECT_URL to .env." >&2
  exit 1
fi

TARGET_HOST="$(echo "$TARGET_URL" | sed -E 's|.*@([^:/]+).*|\1|')"

echo "WARNING — this will DROP and RECREATE every table in the public schema of:"
echo "   $TARGET_HOST"
echo "   using $DUMP"
read -r -p "Type the host name ($TARGET_HOST) to confirm: " CONFIRM
if [[ "$CONFIRM" != "$TARGET_HOST" ]]; then
  echo "Aborted."
  exit 1
fi

command -v pg_restore >/dev/null 2>&1 || { echo "ERROR: pg_restore not on PATH" >&2; exit 1; }

CONN_STR="${TARGET_URL%%\?*}"
TMP_DUMP="$(mktemp /tmp/commonsia-restore.XXXXXX.dump)"
trap 'rm -f "$TMP_DUMP"' EXIT

echo "Decompressing $DUMP ..."
gunzip -c "$DUMP" > "$TMP_DUMP"

echo "Running pg_restore..."
pg_restore --clean --if-exists --no-owner --no-privileges --verbose --dbname="$CONN_STR" "$TMP_DUMP" || {
  echo "pg_restore reported warnings/errors (inspect log above)."
}

echo "Restore complete."
