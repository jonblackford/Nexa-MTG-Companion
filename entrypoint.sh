#!/usr/bin/env sh
set -eu

PORT="${PORT:-8080}"

APP_HOME="/app/mtgcompanion"
cd "$APP_HOME"

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
echo "[boot] lib jars:"
ls -la ./lib || true
echo "[boot] conf files:"
ls -la ./conf || true

# Find the jar that contains org/magic/main/ServerLauncher.class
MAIN_JAR=""
for j in ./lib/*.jar ./*.jar; do
  [ -f "$j" ] || continue
  if jar tf "$j" 2>/dev/null | grep -q "org/magic/main/ServerLauncher.class"; then
    MAIN_JAR="$j"
    break
  fi
done

if [ -z "$MAIN_JAR" ]; then
  echo "[boot][ERROR] Could not locate ServerLauncher in any jar under ./lib or app root."
  echo "[boot] Showing first 50 jar names in ./lib:"
  ls -1 ./lib/*.jar 2>/dev/null | head -n 50 || true
  exit 1
fi

echo "[boot] MAIN_JAR=$MAIN_JAR"

EXTRA_JVM_ARGS="-Xmx1024m -Djava.awt.headless=true -Dlog4j2.formatMsgNoLookups=true --add-opens=java.base/java.util=ALL-UNNAMED --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.invoke=ALL-UNNAMED"

CLASSPATH="./conf:$MAIN_JAR:./lib/*"

echo "[boot] Starting Json Http Server on port $PORT"
exec java $EXTRA_JVM_ARGS -cp "$CLASSPATH" org.magic.main.ServerLauncher "Json Http Server"

