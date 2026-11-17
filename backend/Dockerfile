# ===================================================================
# NoteLagbe Backend - Production Multi-Stage Dockerfile (Java 21)
# ===================================================================

# Stage 1: Build Spring Boot Jar
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build jar
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Ultra-lightweight Eclipse Temurin JRE 21 runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add curl for healthchecks
RUN apk add --no-cache curl

# Copy fat jar from builder
COPY --from=build /workspace/target/notelagbe-backend-1.0.0.jar app.jar

# Render automatically binds to PORT environment variable
ENV PORT=10000
EXPOSE 10000

# Run with container optimizations and cgroup memory limits to prevent sudden SIGKILL on Render 512MB RAM
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Xss512k", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
