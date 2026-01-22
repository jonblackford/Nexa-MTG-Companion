#!/usr/bin/env sh
set -eu

PORT="${PORT:-8080}"

APP_HOME="/app/mtgcompanion"
cd "$APP_HOME"

# Cap heap for Render free instances (512Mi) and keep existing headless flag.
# Render already sets JAVA_TOOL_OPTIONS for us; extend it safely.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Xms64m -Xmx384m -XX:MaxMetaspaceSize=128m"

CONF_DIR="/root/.magicDeskCompanion/server"
CONF_FILE="$CONF_DIR/Json Http Server.conf"
mkdir -p "$CONF_DIR"

if [ ! -f "$CONF_FILE" ]; then
  cat > "$CONF_FILE" <<EOF
SERVER-PORT=$PORT
ENABLE_GZIP=true
INDEX_ROUTES=true
ENABLE_SSL=false
PRETTY_PRINT=false
Access-Control-Allow-Origin=*
Access-Control-Request-Method=GET,PUT,POST,DELETE,OPTIONS
Access-Control-Allow-Headers=Content-Type,Authorization,X-Requested-With,Content-Length,Accept,Origin
THREADS=8
EOF
else
  if grep -q "^SERVER-PORT=" "$CONF_FILE"; then
    sed -i "s/^SERVER-PORT=.*/SERVER-PORT=$PORT/" "$CONF_FILE"
  else
    echo "SERVER-PORT=$PORT" >> "$CONF_FILE"
  fi
fi

echo "[boot] APP_HOME=$APP_HOME"
echo "[boot] Using PORT=$PORT"
echo "[boot] JAVA_TOOL_OPTIONS=$JAVA_TOOL_OPTIONS"

# Start the Json Http Server
CLASSPATH="./conf:./lib/magic-api.jar:./lib/*"
exec java -cp "$CLASSPATH" org.magic.main.ServerLauncher "Json Http Server"
