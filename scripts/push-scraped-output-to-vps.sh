#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-"$ROOT_DIR/backend/.catalog-output"}"
SOURCE_DB_DIR="${SOURCE_DB_DIR:-"$ROOT_DIR/backend/.catalog-data"}"
SOURCE_DB_PATH="${SOURCE_DB_PATH:-"$SOURCE_DB_DIR/catalog.sqlite"}"
VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
VPS_APP_ROOT="${VPS_APP_ROOT:-/root/apps/iraq-catalog-backend}"
VPS_SHARED_OUTPUT_DIR="${VPS_SHARED_OUTPUT_DIR:-$VPS_APP_ROOT/shared/catalog-output}"
VPS_SHARED_DB_PATH="${VPS_SHARED_DB_PATH:-$VPS_APP_ROOT/shared/catalog.sqlite}"
VPS_SHARED_DB_UPLOAD_PATH="${VPS_SHARED_DB_UPLOAD_PATH:-$VPS_SHARED_DB_PATH.next}"
VPS_BACKUP_DIR="${VPS_BACKUP_DIR:-$VPS_APP_ROOT/shared/catalog-backups}"
PM2_APP_NAME="${PM2_APP_NAME:-iraq-catalog-backend}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://cf.h-db.site}"
PREPARE_LOCAL_DB="${PREPARE_LOCAL_DB:-1}"
PREPARE_SEARCH_INDEX="${PREPARE_SEARCH_INDEX:-1}"
SYNC_OUTPUT_MIRROR="${SYNC_OUTPUT_MIRROR:-0}"
REMOTE_PORT="${REMOTE_PORT:-22}"

if [[ -z "$VPS_HOST" ]]; then
  echo "Set VPS_HOST before running this script."
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR"
  exit 1
fi

if [[ ! -f "$SOURCE_DB_PATH" ]]; then
  echo "SQLite database not found: $SOURCE_DB_PATH"
  exit 1
fi

SSH_BIN=(ssh -p "$REMOTE_PORT")
SCP_BIN=(scp -P "$REMOTE_PORT")

if [[ -n "${SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BIN=(sshpass -p "$SSH_PASSWORD" ssh -p "$REMOTE_PORT")
  SCP_BIN=(sshpass -p "$SSH_PASSWORD" scp -P "$REMOTE_PORT")
fi

REMOTE="$VPS_USER@$VPS_HOST"

if [[ "$PREPARE_LOCAL_DB" == "1" ]]; then
  echo "Preparing local SQLite database for deploy: $SOURCE_DB_PATH"
  sqlite3 "$SOURCE_DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA optimize;" >/dev/null
  rm -f "${SOURCE_DB_PATH}-wal" "${SOURCE_DB_PATH}-shm"
fi

LOCAL_PRODUCT_COUNT="$(sqlite3 "$SOURCE_DB_PATH" "SELECT COUNT(*) FROM catalog_products;")"
LOCAL_SEARCH_DOC_COUNT="$(sqlite3 "$SOURCE_DB_PATH" "SELECT COUNT(*) FROM search_documents;")"

if [[ "$PREPARE_SEARCH_INDEX" == "1" && "$LOCAL_PRODUCT_COUNT" != "$LOCAL_SEARCH_DOC_COUNT" ]]; then
  echo "Rebuilding search index locally because search_documents ($LOCAL_SEARCH_DOC_COUNT) != catalog_products ($LOCAL_PRODUCT_COUNT)"
  (
    cd "$ROOT_DIR/backend"
    CATALOG_ALLOW_INSECURE_DEFAULTS=true \
    CATALOG_SKIP_SCRAPED_IMPORT=true \
    CATALOG_SKIP_STARTUP_REINDEX=true \
    SNAPSHOT_STORAGE_DRIVER=local \
    SNAPSHOT_LOCAL_STORAGE_DIR=.catalog-storage/reindex-search \
    SQLITE_DATABASE_PATH="$SOURCE_DB_PATH" \
    npm run reindex:search >/dev/null
  )
  sqlite3 "$SOURCE_DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA optimize;" >/dev/null
  rm -f "${SOURCE_DB_PATH}-wal" "${SOURCE_DB_PATH}-shm"
fi

LOCAL_COUNTS_JSON="$(sqlite3 -json "$SOURCE_DB_PATH" "
  SELECT
    (SELECT COUNT(*) FROM stores) AS stores,
    (SELECT COUNT(*) FROM catalog_products) AS products,
    (SELECT COUNT(*) FROM product_variants) AS variants,
    (SELECT COUNT(*) FROM offers) AS offers;
")"

echo "Local catalog counts: $LOCAL_COUNTS_JSON"

"${SSH_BIN[@]}" "$REMOTE" "mkdir -p '$VPS_SHARED_OUTPUT_DIR' '$VPS_APP_ROOT/shared/catalog-storage' '$VPS_BACKUP_DIR'"

if command -v rsync >/dev/null 2>&1; then
  RSYNC_BIN=(rsync -az --delete -e "ssh -p $REMOTE_PORT")
  if [[ -n "${SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    RSYNC_BIN=(sshpass -p "$SSH_PASSWORD" rsync -az --delete -e "ssh -p $REMOTE_PORT")
  fi
  if [[ "$SYNC_OUTPUT_MIRROR" == "1" ]]; then
    "${RSYNC_BIN[@]}" "$SOURCE_DIR"/ "$REMOTE:$VPS_SHARED_OUTPUT_DIR"/
  fi
  "${RSYNC_BIN[@]}" "$SOURCE_DB_PATH" "$REMOTE:$VPS_SHARED_DB_UPLOAD_PATH"
else
  if [[ "$SYNC_OUTPUT_MIRROR" == "1" ]]; then
    TMP_TAR="$(mktemp /tmp/catalog-output.XXXXXX.tgz)"
    tar -C "$SOURCE_DIR" -czf "$TMP_TAR" .
    "${SCP_BIN[@]}" "$TMP_TAR" "$REMOTE:/tmp/catalog-output-upload.tgz"
    "${SSH_BIN[@]}" "$REMOTE" "mkdir -p '$VPS_SHARED_OUTPUT_DIR' && tar -xzf /tmp/catalog-output-upload.tgz -C '$VPS_SHARED_OUTPUT_DIR' && rm -f /tmp/catalog-output-upload.tgz"
    rm -f "$TMP_TAR"
  fi
  "${SCP_BIN[@]}" "$SOURCE_DB_PATH" "$REMOTE:$VPS_SHARED_DB_UPLOAD_PATH"
fi

"${SSH_BIN[@]}" "$REMOTE" "
  set -e
  mkdir -p '$VPS_APP_ROOT/current/.catalog-data' '$VPS_APP_ROOT/shared/catalog-output' '$VPS_APP_ROOT/shared/catalog-storage' '$VPS_BACKUP_DIR'
  ln -sfn '$VPS_APP_ROOT/shared/catalog-storage' '$VPS_APP_ROOT/current/.catalog-storage'
  ln -sfn '$VPS_BACKUP_DIR' '$VPS_APP_ROOT/current/.catalog-backups'
  rm -f '$VPS_APP_ROOT/current/.catalog-output'

  if [ ! -f '$VPS_SHARED_DB_UPLOAD_PATH' ]; then
    echo 'Uploaded database file missing: $VPS_SHARED_DB_UPLOAD_PATH' >&2
    exit 1
  fi

  sqlite3 '$VPS_SHARED_DB_UPLOAD_PATH' 'PRAGMA quick_check;' | grep -qx 'ok'
  DEPLOY_TS=\$(date +%Y%m%d-%H%M%S)
  PREV_DB_PATH=\"$VPS_BACKUP_DIR/catalog-\$DEPLOY_TS.sqlite\"

  pm2 stop '$PM2_APP_NAME' >/dev/null 2>&1 || true
  rm -f '${VPS_SHARED_DB_PATH}-wal' '${VPS_SHARED_DB_PATH}-shm' '${VPS_SHARED_DB_UPLOAD_PATH}-wal' '${VPS_SHARED_DB_UPLOAD_PATH}-shm'

  if [ -f '$VPS_SHARED_DB_PATH' ]; then
    mv '$VPS_SHARED_DB_PATH' \"\$PREV_DB_PATH\"
  fi

  mv '$VPS_SHARED_DB_UPLOAD_PATH' '$VPS_SHARED_DB_PATH'
  chmod 0644 '$VPS_SHARED_DB_PATH'

  pm2 restart '$PM2_APP_NAME' --update-env
  sleep 4

  if ! curl -m 10 -fsS 'http://127.0.0.1:4400/healthz' >/dev/null || \
     ! curl -m 10 -fsS 'http://127.0.0.1:4400/public/healthz' >/dev/null || \
     ! curl -m 20 -fsS '$PUBLIC_BASE_URL/public/bootstrap' >/dev/null || \
     ! curl -m 20 -fsS '$PUBLIC_BASE_URL/public/search?q=iphone' >/dev/null; then
    echo 'Health checks failed after deploy; attempting rollback.' >&2
    pm2 stop '$PM2_APP_NAME' >/dev/null 2>&1 || true
    rm -f '$VPS_SHARED_DB_PATH'
    if [ -f \"\$PREV_DB_PATH\" ]; then
      mv \"\$PREV_DB_PATH\" '$VPS_SHARED_DB_PATH'
    fi
    pm2 restart '$PM2_APP_NAME' --update-env
    exit 1
  fi

  sqlite3 -json '$VPS_SHARED_DB_PATH' '
    SELECT
      (SELECT COUNT(*) FROM stores) AS stores,
      (SELECT COUNT(*) FROM catalog_products) AS products,
      (SELECT COUNT(*) FROM product_variants) AS variants,
      (SELECT COUNT(*) FROM offers) AS offers;
  '
"

if [[ "$SYNC_OUTPUT_MIRROR" == "1" ]]; then
  echo "Catalog output mirror + SQLite synced to $REMOTE, live DB swapped safely at $VPS_SHARED_DB_PATH, and backend verified."
else
  echo "SQLite synced to $REMOTE, live DB swapped safely at $VPS_SHARED_DB_PATH, and backend verified."
fi
