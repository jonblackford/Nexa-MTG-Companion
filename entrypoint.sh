#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

CONF_DIR="/root/.magicDeskCompanion/server"
CONF_FILE="$CONF_DIR/Json Http Server.conf"

mkdir -p "$CONF_DIR"

# Create config if missing (or update port if it exists)
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

# Start ONLY the JSON API server (you don't need the built-in web server since GitHub Pages hosts the UI)
exec /app/mtgcompanion/bin/server-launch.sh "Json Http Server"
