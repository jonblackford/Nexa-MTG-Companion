#!/usr/bin/env sh
set -eu

PORT="${PORT:-8080}"

APP_HOME="/app/mtgcompanion"
cd "$APP_HOME"

# Write/update server config to bind Render's $PORT + allow CORS
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
echo "[boot] Checking for project jar:"
ls -la ./lib/magic-api.jar || true

# If the project jar isn't there, print a short diagnostic and exit
if [ ! -f "./lib/magic-api.jar" ]; then
  echo "[boot][ERROR] ./lib/magic-api.jar is missing. This jar must contain org.magic.main.ServerLauncher."
  echo "[boot] Showing first 50 jars in ./lib:"
  ls -1 ./lib/*.jar 2>/dev/null | head -n 50 || true
  exit 1
fi

# Start the Json Http Server
# Put magic-api.jar first so the main class is definitely resolvable.
CLASSPATH="./conf:./lib/magic-api.jar:./lib/*"

echo "[boot] Starting Json Http Server on port $PORT"
exec java -cp "$CLASSPATH" org.magic.main.ServerLauncher "Json Http Server"
