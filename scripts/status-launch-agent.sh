#!/bin/zsh

set -euo pipefail

LABEL="com.mohamed.zipuploadbuddy.localhost"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
BACKEND_PORT="${BACKEND_PORT:-4400}"
APP_ROOT="$(cd -- "$(dirname -- "$0")/.." && pwd)"

echo "Label: ${LABEL}"
echo

launchctl print "gui/$UID/$LABEL" 2>/dev/null | sed -n '1,40p' || echo "launchd job is not loaded"
echo

echo "Frontend listeners:"
lsof -nP -iTCP:"$FRONTEND_PORT" -sTCP:LISTEN || true
echo

echo "Backend listeners:"
lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN || true
echo

echo "Frontend check:"
curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null && echo "OK" || echo "DOWN"
echo

echo "Backend check:"
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/public/healthz" || echo "DOWN"
echo

echo "Log directory: ${APP_ROOT}/logs/always-on"
