#!/bin/zsh

set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_ROOT="${APP_ROOT_OVERRIDE:-$(cd -- "$SCRIPT_DIR/.." && pwd)}"
BACKEND_ROOT="$APP_ROOT/backend"
LOG_DIR="${LOG_DIR_OVERRIDE:-$APP_ROOT/logs/always-on}"
BACKEND_STATE_DIR="${BACKEND_STATE_DIR_OVERRIDE:-$BACKEND_ROOT/.catalog-storage/miswag}"
FRONTEND_SERVER_SCRIPT="${FRONTEND_SERVER_SCRIPT_OVERRIDE:-$APP_ROOT/scripts/serve-dist-with-proxy.mjs}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
BACKEND_PORT="${BACKEND_PORT:-4400}"
NPM_BIN="${NPM_BIN:-$(command -v npm)}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

mkdir -p "$LOG_DIR"

if [[ -z "$NPM_BIN" ]]; then
  echo "npm was not found on PATH" >&2
  exit 1
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "node was not found on PATH" >&2
  exit 1
fi

frontend_pid=""
backend_pid=""

cleanup() {
  local exit_code="${1:-0}"

  for pid in "$frontend_pid" "$backend_pid"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  sleep 1

  for pid in "$frontend_pid" "$backend_pid"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done

  exit "$exit_code"
}

trap 'cleanup 0' INT TERM
trap 'cleanup 1' EXIT

wait_for_http() {
  local url="$1"
  local label="$2"
  local tries="${3:-120}"

  while (( tries > 0 )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    if [[ -n "$backend_pid" ]] && ! kill -0 "$backend_pid" 2>/dev/null; then
      echo "$label failed because the backend process exited early" >&2
      return 1
    fi

    if [[ -n "$frontend_pid" ]] && ! kill -0 "$frontend_pid" 2>/dev/null; then
      echo "$label failed because the frontend process exited early" >&2
      return 1
    fi

    sleep 2
    tries=$((tries - 1))
  done

  echo "Timed out waiting for $label at $url" >&2
  return 1
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backend on port $BACKEND_PORT" >> "$LOG_DIR/supervisor.log"
(
  cd "$BACKEND_ROOT"
  SNAPSHOT_STORAGE_DRIVER=local \
  SNAPSHOT_LOCAL_STORAGE_DIR="$BACKEND_STATE_DIR" \
  "$NPM_BIN" run dev:memory-api -- --store-id manual_miswag --concurrency 1 --port "$BACKEND_PORT"
) >> "$LOG_DIR/backend.log" 2>&1 &
backend_pid=$!

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting frontend on port $FRONTEND_PORT" >> "$LOG_DIR/supervisor.log"
(
  APP_ROOT_OVERRIDE="$APP_ROOT" \
  FRONTEND_PORT="$FRONTEND_PORT" \
  BACKEND_PORT="$BACKEND_PORT" \
  "$NODE_BIN" "$FRONTEND_SERVER_SCRIPT"
) >> "$LOG_DIR/frontend.log" 2>&1 &
frontend_pid=$!

wait_for_http "http://127.0.0.1:${FRONTEND_PORT}/" "frontend root"
wait_for_http "http://127.0.0.1:${BACKEND_PORT}/public/healthz" "backend health" 300

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Frontend PID $frontend_pid, backend PID $backend_pid" >> "$LOG_DIR/supervisor.log"

while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend exited; requesting launchd restart" >> "$LOG_DIR/supervisor.log"
    exit 1
  fi

  if ! kill -0 "$frontend_pid" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Frontend exited; requesting launchd restart" >> "$LOG_DIR/supervisor.log"
    exit 1
  fi

  sleep 5
done
