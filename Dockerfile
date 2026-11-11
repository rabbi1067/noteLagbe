# ===================================================================
# NoteLagbe Backend - Root Dockerfile for Render Deployments
# ===================================================================

FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY backend/pom.xml ./pom.xml
RUN mvn dependency:go-offline -B

COPY backend/src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl

COPY --from=build /workspace/target/notelagbe-backend-1.0.0.jar app.jar

ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:+UseSerialGC", "-XX:+ExitOnOutOfMemoryError", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
