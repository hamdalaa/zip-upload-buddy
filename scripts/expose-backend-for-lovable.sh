#!/usr/bin/env zsh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ROOT="$APP_ROOT/backend"
PORT="${PORT:-4402}"
ORIGINS="${CATALOG_ALLOWED_ORIGINS:-*}"

find_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return 0
  fi

  if [[ -x /tmp/cloudflared-install/cloudflared ]]; then
    echo /tmp/cloudflared-install/cloudflared
    return 0
  fi

  return 1
}

if ! curl -fsS "http://127.0.0.1:${PORT}/public/healthz" >/dev/null 2>&1; then
  echo "Starting backend on http://127.0.0.1:${PORT}"
  cd "$BACKEND_ROOT"
  exec env \
    PORT="$PORT" \
    CATALOG_ALLOWED_ORIGINS="$ORIGINS" \
    npm run dev:sqlite-api
fi

echo "Backend already running on http://127.0.0.1:${PORT}"

if [[ "${1:-}" != "--tunnel" ]]; then
  echo "Run with --tunnel to expose it publicly for Lovable."
  exit 0
fi

CLOUDFLARED_BIN="$(find_cloudflared || true)"
if [[ -z "$CLOUDFLARED_BIN" ]]; then
  cat <<EOF
cloudflared is not installed.

Install with one of:
  brew install cloudflared
  or download the darwin arm64 binary from Cloudflare docs

Then run:
  PORT=${PORT} $0 --tunnel
EOF
  exit 1
fi

echo "Opening Cloudflare Quick Tunnel to http://127.0.0.1:${PORT}"
exec "$CLOUDFLARED_BIN" tunnel --url "http://127.0.0.1:${PORT}"
