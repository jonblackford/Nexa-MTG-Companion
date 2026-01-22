# syntax=docker/dockerfile:1

# -----------------------------
# Build stage
# -----------------------------
FROM maven:3.9.9-eclipse-temurin-23 AS build
WORKDIR /build

COPY . .

# IMPORTANT:
# -DskipTests still compiles tests; this repo's tests fail to compile in CI.
RUN mvn -Dmaven.test.skip=true package

# Ensure the project jar is present in the assembled app lib folder
# (Appassembler sometimes only copies dependencies).
RUN mkdir -p target/executable/lib  && if [ -f target/magic-api.jar ]; then cp -v target/magic-api.jar target/executable/lib/; fi

# -----------------------------
# Runtime stage
# -----------------------------
FROM eclipse-temurin:23-jre
WORKDIR /app

COPY --from=build /build/target/executable ./mtgcompanion
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"
EXPOSE 8080
VOLUME ["/root/.magicDeskCompanion"]

ENTRYPOINT ["/entrypoint.sh"]