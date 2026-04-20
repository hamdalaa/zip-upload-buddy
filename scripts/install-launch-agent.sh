#!/bin/zsh

set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$APP_ROOT/logs/always-on"
LAUNCHD_LOG_DIR="$HOME/Library/Logs/zip-upload-buddy"
RUNTIME_LOG_DIR="$LAUNCHD_LOG_DIR/runtime"
LAUNCHD_RUNNER_DIR="$HOME/Library/Application Support/zip-upload-buddy"
LAUNCHD_RUNNER_PATH="$LAUNCHD_RUNNER_DIR/always-on-localhost.sh"
LAUNCHD_FRONTEND_SERVER_PATH="$LAUNCHD_RUNNER_DIR/serve-dist-with-proxy.mjs"
LAUNCHD_STATE_DIR="$LAUNCHD_RUNNER_DIR/state"
LABEL="com.mohamed.zipuploadbuddy.localhost"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
BACKEND_PORT="${BACKEND_PORT:-4400}"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR" "$LAUNCHD_LOG_DIR" "$RUNTIME_LOG_DIR" "$LAUNCHD_RUNNER_DIR" "$LAUNCHD_STATE_DIR"
cp "$APP_ROOT/scripts/always-on-localhost.sh" "$LAUNCHD_RUNNER_PATH"
cp "$APP_ROOT/scripts/serve-dist-with-proxy.mjs" "$LAUNCHD_FRONTEND_SERVER_PATH"
chmod +x "$LAUNCHD_RUNNER_PATH"

stop_port_listener() {
  local port="$1"
  local pids

  pids="$( { lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true; } | paste -sd ' ' -)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  echo "Stopping listeners on port $port: $pids"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$( { lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true; } | paste -sd ' ' -)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
}

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
      <string>/bin/zsh</string>
      <string>${LAUNCHD_RUNNER_PATH}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
      <key>APP_ROOT_OVERRIDE</key>
      <string>${APP_ROOT}</string>
      <key>LOG_DIR_OVERRIDE</key>
      <string>${RUNTIME_LOG_DIR}</string>
      <key>BACKEND_STATE_DIR_OVERRIDE</key>
      <string>${LAUNCHD_STATE_DIR}/miswag</string>
      <key>FRONTEND_SERVER_SCRIPT_OVERRIDE</key>
      <string>${LAUNCHD_FRONTEND_SERVER_PATH}</string>
      <key>FRONTEND_PORT</key>
      <string>${FRONTEND_PORT}</string>
      <key>BACKEND_PORT</key>
      <string>${BACKEND_PORT}</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>StandardOutPath</key>
    <string>${LAUNCHD_LOG_DIR}/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>${LAUNCHD_LOG_DIR}/launchd.log</string>
  </dict>
</plist>
EOF

launchctl bootout "gui/$UID/$LABEL" >/dev/null 2>&1 || true
stop_port_listener "$FRONTEND_PORT"
stop_port_listener "$BACKEND_PORT"
launchctl bootstrap "gui/$UID" "$PLIST_PATH"
launchctl enable "gui/$UID/$LABEL" >/dev/null 2>&1 || true
launchctl kickstart -k "gui/$UID/$LABEL"

echo "Installed ${LABEL}"
echo "Plist: ${PLIST_PATH}"
echo "Logs: ${LOG_DIR}"
echo "Launchd logs: ${LAUNCHD_LOG_DIR}"
