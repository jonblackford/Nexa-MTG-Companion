#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

APP_HOME="/app/mtgcompanion"
cd "$APP_HOME"

# Bind to Render's $PORT + permissive CORS for GitHub Pages frontend
CONF_DIR="/root/.magicDeskCompanion/server"
CONF_FILE="$CONF_DIR/Json Http Server.conf"
mkdir -p "$CONF_DIR"

if [[ ! -f "$CONF_FILE" ]]; then
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
echo "[boot] magic-api.jar size:"
ls -lah ./lib/magic-api*.jar 2>/dev/null || true

# Launch Json Http Server using the appassembler script (uses the correct classpath)
exec ./bin/server-launch.sh "Json Http Server"
