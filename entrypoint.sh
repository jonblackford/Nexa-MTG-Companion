#!/usr/bin/env sh
set -eu

PORT="${PORT:-8080}"

APP_HOME="/app/mtgcompanion"
cd "$APP_HOME"

# Cap heap for Render free instances (512Mi) and keep existing headless flag.
# Render already sets JAVA_TOOL_OPTIONS for us; extend it safely.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Xms64m -Xmx384m -XX:MaxMetaspaceSize=128m"

# Optional env overrides (recommended to set these in Render -> Environment)
JWT_SECRET="${JWT_SECRET:-}"
TIMEOUT_CACHE_MINUTES="${TIMEOUT_CACHE_MINUTES:-10}"
BLOCKED_IPS="${BLOCKED_IPS:-}" # comma-separated list, or empty

# If no JWT_SECRET is provided, generate a per-boot one (better than missing, but not stable across restarts)
if [ -z "$JWT_SECRET" ]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET="$(openssl rand -hex 32)"
  else
    JWT_SECRET="$(date +%s)-$RANDOM-$RANDOM-$RANDOM"
  fi
  echo "[boot][WARN] JWT_SECRET was not set; generated an ephemeral secret for this boot. Set JWT_SECRET in Render env for stability."
fi

CONF_DIR="/root/.magicDeskCompanion/server"
CONF_FILE="$CONF_DIR/Json Http Server.conf"
mkdir -p "$CONF_DIR"

# Always (re)write the config so changes in env vars apply on redeploys.
cat > "$CONF_FILE" <<EOF
SERVER-PORT=$PORT
ENABLE_GZIP=true
INDEX_ROUTES=true
ENABLE_SSL=false
PRETTY_PRINT=false

# CORS
Access-Control-Allow-Origin=*
Access-Control-Request-Method=GET,PUT,POST,DELETE,OPTIONS
Access-Control-Allow-Headers=Content-Type,Authorization,X-Requested-With,Content-Length,Accept,Origin

THREADS=8

# JSONHttpServer optional settings (prevents noisy "is not found" logs)
TIMEOUT_CACHE_MINUTES=$TIMEOUT_CACHE_MINUTES
JWT_SECRET=$JWT_SECRET
BLOCKED_IPS=$BLOCKED_IPS
EOF

echo "[boot] APP_HOME=$APP_HOME"
echo "[boot] Using PORT=$PORT"
echo "[boot] TIMEOUT_CACHE_MINUTES=$TIMEOUT_CACHE_MINUTES"
echo "[boot] BLOCKED_IPS=${BLOCKED_IPS:-<empty>}"
echo "[boot] JAVA_TOOL_OPTIONS=$JAVA_TOOL_OPTIONS"

# Start the Json Http Server
CLASSPATH="./conf:./lib/magic-api.jar:./lib/*"
exec java -cp "$CLASSPATH" org.magic.main.ServerLauncher "Json Http Server"