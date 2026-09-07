# Build stage
FROM container-registry.oracle.com/java/jdk:21 AS build
WORKDIR /app

# Copy maven wrapper and pom.xml
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Convert line endings if needed (requires dos2unix, but we'll assume clean repo)
# If developing on Windows, ensure git core.autocrlf is true or run dos2unix before Docker build
RUN chmod +x mvnw

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline

# Copy source code and build
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Run stage
FROM container-registry.oracle.com/java/jdk:21
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
