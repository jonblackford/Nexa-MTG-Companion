# syntax=docker/dockerfile:1

### Build stage
FROM maven:3.9.9-eclipse-temurin-23 AS build
WORKDIR /build

# Copy the whole repo (simplest + avoids missing folder issues like /lib)
COPY . .

# IMPORTANT:
# -DskipTests skips running tests BUT still compiles them.
# -Dmaven.test.skip=true skips compiling tests too (needed for this repo on CI hosts).
RUN mvn -Dmaven.test.skip=true package

### Runtime stage
FROM eclipse-temurin:23-jre
WORKDIR /app

# Copy the generated runnable distribution
COPY --from=build /build/target/executable ./mtgcompanion

# Entrypoint that sets SERVER-PORT from Render's $PORT
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chmod +x /app/mtgcompanion/bin/*.sh

ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"
EXPOSE 8080
VOLUME ["/root/.magicDeskCompanion"]

ENTRYPOINT ["/entrypoint.sh"]
