# Build stage
FROM oraclelinux:9-slim AS build
WORKDIR /app

# Cài đặt Oracle JDK 21 trực tiếp từ server của Oracle (không cần đăng nhập)
RUN microdnf install -y wget && \
    wget https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.rpm && \
    rpm -ivh jdk-21_linux-x64_bin.rpm && \
    rm jdk-21_linux-x64_bin.rpm && \
    microdnf clean all

# Copy maven wrapper và cấu hình
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Tải dependencies trước
RUN ./mvnw dependency:go-offline

# Copy source code và build
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Run stage
FROM oraclelinux:9-slim
WORKDIR /app

# Cài đặt lại Oracle JDK 21 cho môi trường chạy
RUN microdnf install -y wget && \
    wget https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.rpm && \
    rpm -ivh jdk-21_linux-x64_bin.rpm && \
    rm jdk-21_linux-x64_bin.rpm && \
    microdnf clean all

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
