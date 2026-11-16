# syntax=docker/dockerfile:1.7
# Build stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy maven wrapper and pom.xml
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Convert line endings of mvnw (necessary when building from a Windows host)
RUN apk add --no-cache dos2unix && dos2unix mvnw && chmod +x mvnw

# Keep Maven artifacts between BuildKit builds. The pom.xml layer still
# invalidates correctly when dependencies change, while ordinary code edits
# no longer re-download the full Firebase/Spring dependency graph.
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline

# Copy source code and build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
