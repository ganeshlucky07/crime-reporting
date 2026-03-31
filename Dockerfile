# Use Maven base image
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Use JDK for runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/crime-reporting-0.0.1-SNAPSHOT.jar app.jar

# Environment variables
ENV SQLITE_DB_PATH=./crime_reporting.db
ENV JWT_EXPIRATION_MS=86400000
ENV ADMIN_NAME="System Admin"
ENV ADMIN_EMAIL=admin@crime.local
ENV ADMIN_PASSWORD=Admin@12345
ENV MEDIA_UPLOAD_DIR=./uploads
ENV MEDIA_MAX_FILES_PER_REPORT=5
ENV MEDIA_MAX_IMAGE_BYTES=2097152
ENV MEDIA_MAX_VIDEO_BYTES=10485760
ENV MULTIPART_MAX_FILE_SIZE=10MB
ENV MULTIPART_MAX_REQUEST_SIZE=50MB

EXPOSE 8080

# Use $PORT env var from Render
CMD ["sh", "-c", "java -Dserver.port=$PORT -jar app.jar"]
