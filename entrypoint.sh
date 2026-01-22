#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

# IMPORTANT: Appassembler scripts often rely on relative paths (./lib, ./conf, etc.).
# Ensure we're in the assembled app root before launching.
cd /app/mtgcompanion

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

# Launch JSON API server
exec ./bin/server-launch.sh "Json Http Server"
