#!/usr/bin/env sh
set -eu

PORT="${PORT:-8080}"

# App home (appassembler output)
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
    # busybox-compatible sed
    sed -i "s/^SERVER-PORT=.*/SERVER-PORT=$PORT/" "$CONF_FILE"
  else
    echo "SERVER-PORT=$PORT" >> "$CONF_FILE"
  fi
fi

# Sanity checks (prints show up in Render logs and help debugging)
echo "[boot] APP_HOME=$APP_HOME"
echo "[boot] Listing lib directory:"
ls -la ./lib || true
echo "[boot] Listing conf directory:"
ls -la ./conf || true

# Bypass generated scripts and run Java directly with explicit classpath.
# This avoids ClassNotFound issues if the appassembler launch script calculates paths incorrectly.
EXTRA_JVM_ARGS="-Xmx1024m -Dlog4j2.formatMsgNoLookups=true -Djdk.tls.client.protocols=TLSv1,TLSv1.1,TLSv1.2 -Djava.library.path=./natives -Dorg.apache.lucene.store.MMapDirectory.enableMemorySegments=false --add-opens=java.base/java.util=ALL-UNNAMED --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.invoke=ALL-UNNAMED"

CLASSPATH="./conf:./lib/*"

echo "[boot] Starting Json Http Server on port $PORT"
exec java $EXTRA_JVM_ARGS -cp "$CLASSPATH" org.magic.main.ServerLauncher "Json Http Server"
