# syntax=docker/dockerfile:1

### Build stage
FROM maven:3.9.9-eclipse-temurin-23 AS build
WORKDIR /build

# Copy repo
COPY . .

# Skip compiling tests too (this repo's tests don't compile in CI)
RUN mvn -Dmaven.test.skip=true package

# Appassembler output is under target/executable.
# Ensure the *project* jar(s) are included in the assembled lib folder,
# because some builds don't place them there by default.
RUN mkdir -p target/executable/lib && (cp -v target/*.jar target/executable/lib/ || true)

### Runtime stage
FROM eclipse-temurin:23-jre
WORKDIR /app

COPY --from=build /build/target/executable ./mtgcompanion

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"
EXPOSE 8080
VOLUME ["/root/.magicDeskCompanion"]

ENTRYPOINT ["/entrypoint.sh"]


# Copy the generated runnable distribution
COPY --from=build /build/target/executable ./mtgcompanion

# Entrypoint that sets SERVER-PORT from Render's $PORT
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chmod +x /app/mtgcompanion/bin/*.sh

ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"
EXPOSE 8080
VOLUME ["/root/.magicDeskCompanion"]

ENTRYPOINT ["/entrypoint.sh"]