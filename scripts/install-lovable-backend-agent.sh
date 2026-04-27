#!/bin/zsh

set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
LAUNCHD_RUNNER_DIR="$HOME/Library/Application Support/zip-hayer-lovable"
LAUNCHD_LOG_DIR="$HOME/Library/Logs/zip-hayer-lovable"
BIN_DIR="$LAUNCHD_RUNNER_DIR/bin"
RUNTIME_DIR="$LAUNCHD_RUNNER_DIR/runtime"
RUNNER_PATH="$LAUNCHD_RUNNER_DIR/always-on-lovable-backend.sh"
LABEL="com.mohamed.ziphayer.lovable.backend"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
BACKEND_PORT="${BACKEND_PORT:-4402}"
ENABLE_TUNNEL="${ENABLE_TUNNEL:-true}"

mkdir -p "$HOME/Library/LaunchAgents" "$LAUNCHD_RUNNER_DIR" "$LAUNCHD_LOG_DIR" "$BIN_DIR" "$RUNTIME_DIR"
cp "$APP_ROOT/scripts/always-on-lovable-backend.sh" "$RUNNER_PATH"
chmod +x "$RUNNER_PATH"

if [[ -x /tmp/cloudflared-install/cloudflared ]]; then
  cp /tmp/cloudflared-install/cloudflared "$BIN_DIR/cloudflared"
  chmod +x "$BIN_DIR/cloudflared"
fi

stop_port_listener() {
  local port="$1"
  local pids
  pids="$( { lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true; } | paste -sd ' ' -)"
  if [[ -z "$pids" ]]; then
    return 0
  fi
  kill $pids 2>/dev/null || true
  sleep 1
  pids="$( { lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true; } | paste -sd ' ' -)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
}

pkill -f 'cloudflared.*trycloudflare' 2>/dev/null || true

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
      <string>${RUNNER_PATH}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
      <key>APP_ROOT_OVERRIDE</key>
      <string>${APP_ROOT}</string>
      <key>LOG_DIR_OVERRIDE</key>
      <string>${LAUNCHD_LOG_DIR}</string>
      <key>BACKEND_PORT</key>
      <string>${BACKEND_PORT}</string>
      <key>CATALOG_ALLOWED_ORIGINS</key>
      <string>*</string>
      <key>ENABLE_TUNNEL</key>
      <string>${ENABLE_TUNNEL}</string>
      <key>TUNNEL_URL_FILE_OVERRIDE</key>
      <string>${LAUNCHD_LOG_DIR}/current-tunnel-url.txt</string>
      <key>TUNNEL_LOG_FILE_OVERRIDE</key>
      <string>${LAUNCHD_LOG_DIR}/tunnel.log</string>
      <key>CLOUDFLARED_BIN</key>
      <string>${BIN_DIR}/cloudflared</string>
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
stop_port_listener "$BACKEND_PORT"
launchctl bootstrap "gui/$UID" "$PLIST_PATH"
launchctl enable "gui/$UID/$LABEL" >/dev/null 2>&1 || true
launchctl kickstart -k "gui/$UID/$LABEL"

echo "Installed ${LABEL}"
echo "Plist: ${PLIST_PATH}"
echo "Logs: ${LAUNCHD_LOG_DIR}"
echo "Tunnel URL file: ${LAUNCHD_LOG_DIR}/current-tunnel-url.txt"
