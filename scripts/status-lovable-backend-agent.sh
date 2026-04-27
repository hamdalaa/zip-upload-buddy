#!/bin/zsh

set -euo pipefail

LABEL="com.mohamed.ziphayer.lovable.backend"
BACKEND_PORT="${BACKEND_PORT:-4402}"
LOG_DIR="$HOME/Library/Logs/zip-hayer-lovable"
URL_FILE="$LOG_DIR/current-tunnel-url.txt"

echo "Label: ${LABEL}"
echo
launchctl print "gui/$UID/$LABEL" 2>/dev/null | sed -n '1,50p' || echo "launchd job is not loaded"
echo
echo "Backend listener:"
lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN || true
echo
echo "Backend health:"
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/public/healthz" || echo "DOWN"
echo
if [[ -f "$URL_FILE" ]]; then
  echo "Current tunnel URL:"
  cat "$URL_FILE"
else
  echo "Current tunnel URL: unavailable"
fi
echo
echo "Logs: $LOG_DIR"
