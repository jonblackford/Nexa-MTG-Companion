# syntax=docker/dockerfile:1

### Build stage
FROM maven:3.9.9-eclipse-temurin-23 AS build
WORKDIR /build
COPY . .
# Skip compiling tests too (tests in this repo frequently require optional modules/providers)
RUN mvn -Dmaven.test.skip=true clean package
# Ensure project jar is present in executable lib (extra safety)
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
