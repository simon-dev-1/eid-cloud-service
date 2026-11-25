#!/usr/bin/env bash
# Dump the eid-cloud PostgreSQL databases and (optionally) back up to a
# restic repository (S3-compatible, e.g. Exoscale SOS or Hetzner Object Storage).
#
# Usage:  BACKUP_DIR=/opt/eid-cloud/backups bash deploy/backup.sh
#         (optionally set RESTIC_REPOSITORY + RESTIC_PASSWORD for off-host backups)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"

COMPOSE=(docker compose -f deploy/docker-compose.prod.yml)

# ── 1. App database (critical) ─────────────────────────────────────────────────
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-eid}" -d "${POSTGRES_DATABASE:-eid}" -Fc \
  > "$BACKUP_DIR/eid-$STAMP.dump"

# ── 2. Verifier database (rebuildable, lower priority) ─────────────────────────
"${COMPOSE[@]}" exec -T verifier_postgres \
  pg_dump -U verifier_user -d verifier_db -Fc \
  > "$BACKUP_DIR/verifier-$STAMP.dump" || echo "verifier dump skipped"

# ── 3. Retention (keep 14 days) ────────────────────────────────────────────────
find "$BACKUP_DIR" -name '*.dump' -mtime +14 -delete

# ── 4. Optional: push to restic (S3-compatible) ────────────────────────────────
if [ -n "${RESTIC_REPOSITORY:-}" ]; then
  echo "Uploading to restic..."
  restic backup "$BACKUP_DIR" --tag "eid-cloud-$STAMP"
  restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 6 --prune
fi

echo "Backup complete: $BACKUP_DIR/eid-$STAMP.dump"
