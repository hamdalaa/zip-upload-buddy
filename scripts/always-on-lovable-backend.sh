#!/bin/zsh

set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_ROOT="${APP_ROOT_OVERRIDE:-$(cd -- "$SCRIPT_DIR/.." && pwd)}"
BACKEND_ROOT="$APP_ROOT/backend"
LOG_DIR="${LOG_DIR_OVERRIDE:-$APP_ROOT/logs/lovable-backend}"
BACKEND_PORT="${BACKEND_PORT:-4402}"
ALLOWED_ORIGINS="${CATALOG_ALLOWED_ORIGINS:-*}"
ENABLE_TUNNEL="${ENABLE_TUNNEL:-true}"
TUNNEL_URL_FILE="${TUNNEL_URL_FILE_OVERRIDE:-$LOG_DIR/current-tunnel-url.txt}"
TUNNEL_LOG_FILE="${TUNNEL_LOG_FILE_OVERRIDE:-$LOG_DIR/tunnel.log}"
BACKEND_LOG_FILE="$LOG_DIR/backend.log"
SUPERVISOR_LOG_FILE="$LOG_DIR/supervisor.log"
NPM_BIN="${NPM_BIN:-$(command -v npm)}"
CLOUDFLARED_BIN="${CLOUDFLARED_BIN:-}"

mkdir -p "$LOG_DIR"
: > "$SUPERVISOR_LOG_FILE"

if [[ -z "$NPM_BIN" ]]; then
  echo "npm was not found on PATH" >&2
  exit 1
fi

if [[ -z "$CLOUDFLARED_BIN" ]]; then
  if command -v cloudflared >/dev/null 2>&1; then
    CLOUDFLARED_BIN="$(command -v cloudflared)"
  elif [[ -x "$HOME/Library/Application Support/zip-hayer-lovable/bin/cloudflared" ]]; then
    CLOUDFLARED_BIN="$HOME/Library/Application Support/zip-hayer-lovable/bin/cloudflared"
  else
    CLOUDFLARED_BIN=""
  fi
fi

backend_pid=""
tunnel_pid=""

cleanup() {
  local exit_code="${1:-0}"

  for pid in "$tunnel_pid" "$backend_pid"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  sleep 1

  for pid in "$tunnel_pid" "$backend_pid"; do
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
      echo "$label failed because backend exited early" >&2
      return 1
    fi

    sleep 2
    tries=$((tries - 1))
  done

  echo "Timed out waiting for $label at $url" >&2
  return 1
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Lovable backend on port $BACKEND_PORT" >> "$SUPERVISOR_LOG_FILE"
(
  cd "$BACKEND_ROOT"
  PORT="$BACKEND_PORT" \
  CATALOG_ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  "$NPM_BIN" run dev:sqlite-api
) >> "$BACKEND_LOG_FILE" 2>&1 &
backend_pid=$!

wait_for_http "http://127.0.0.1:${BACKEND_PORT}/public/healthz" "backend health" 180
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend PID $backend_pid is healthy" >> "$SUPERVISOR_LOG_FILE"

if [[ "$ENABLE_TUNNEL" == "true" && -n "$CLOUDFLARED_BIN" ]]; then
  : > "$TUNNEL_LOG_FILE"
  rm -f "$TUNNEL_URL_FILE"

  (
    "$CLOUDFLARED_BIN" tunnel --url "http://127.0.0.1:${BACKEND_PORT}" 2>&1 \
      | tee -a "$TUNNEL_LOG_FILE" \
      | while IFS= read -r line; do
          print -r -- "$line"
          if [[ "$line" =~ 'https://[^[:space:]]+\.trycloudflare\.com' ]]; then
            print -r -- "$MATCH" > "$TUNNEL_URL_FILE"
          fi
        done
  ) &
  tunnel_pid=$!
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Started cloudflared PID $tunnel_pid" >> "$SUPERVISOR_LOG_FILE"
fi

while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend exited; requesting launchd restart" >> "$SUPERVISOR_LOG_FILE"
    exit 1
  fi

  if [[ -n "$tunnel_pid" ]] && ! kill -0 "$tunnel_pid" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tunnel exited; requesting launchd restart" >> "$SUPERVISOR_LOG_FILE"
    exit 1
  fi

  sleep 5
done
