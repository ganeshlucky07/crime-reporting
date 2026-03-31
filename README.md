# Real-Time Crime Reporting System

A full-stack crime reporting platform built with React, Spring Boot, and SQLite, designed to stay lightweight enough for Render free tier while still supporting JWT authentication, role-based access, Leaflet maps, and realtime report updates through STOMP/WebSocket.

## Stack

- Frontend: React, Vite, Tailwind CSS, Axios, React Router, Leaflet, STOMP
- Backend: Spring Boot, Spring Security, JWT, SQLite (JPA/Hibernate), WebSocket/STOMP
- Database: SQLite
- Deploy targets: Render for backend, Vercel or Netlify for frontend

## Features

- User registration and login with JWT authentication
- BCrypt password hashing and role-based authorization (`USER`, `ADMIN`)
- Admin bootstrap account seeded at startup from environment variables
- Crime report creation with title, description, latitude, and longitude
- Optional media upload on reports (images and videos)
- User-only report tracking via `/api/reports/my`
- Admin-only report listing, filtering, and status updates
- Realtime broadcasts:
  - New report notifications to admins
  - Status update notifications to the owning user
- Render-aware frontend behavior:
  - API retry logic
  - "Server waking up..." loading hints
  - WebSocket reconnect handling
- Pagination and lightweight DTO-based responses

## Project Structure

```text
backend/   Spring Boot API + WebSocket server
frontend/  React + Vite SPA
```

## Backend Configuration

Copy [`backend/.env.example`](/c:/Users/GANESH/OneDrive/Desktop/creame/backend/.env.example) into your local environment or set these variables directly:

- `SQLITE_DB_PATH`
- `JWT_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS`
- `WS_ALLOWED_ORIGINS`
- `JWT_EXPIRATION_MS`
- `MEDIA_UPLOAD_DIR`
- `MEDIA_MAX_FILES_PER_REPORT`
- `MEDIA_MAX_IMAGE_BYTES`
- `MEDIA_MAX_VIDEO_BYTES`
- `MULTIPART_MAX_FILE_SIZE`
- `MULTIPART_MAX_REQUEST_SIZE`

## Frontend Configuration

Copy [`frontend/.env.example`](/c:/Users/GANESH/OneDrive/Desktop/creame/frontend/.env.example) into your local environment:

- `VITE_API_BASE_URL`
- `VITE_WS_BASE_URL`
- `VITE_MAP_DEFAULT_LAT`
- `VITE_MAP_DEFAULT_LNG`

## Local Development

### 1. Configure SQLite

Set `SQLITE_DB_PATH` to a writable file path (for example `./crime_reporting.db`).

### 2. Run the backend

Requirements:

- Java 17
- Maven installed locally

Commands:

```bash
cd backend
mvn spring-boot:run
```

The backend runs on `http://localhost:8080` by default.

### 3. Run the frontend

Commands:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Seeded Admin Account

On first backend startup, the API creates an admin user if `ADMIN_EMAIL` does not already exist.

Default values:

- Email: `admin@crime.local`
- Password: `Admin@12345`

Change these immediately for any real deployment.

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`

### User

- `POST /api/reports` (supports JSON or multipart with `report` + `mediaFiles`)
- `GET /api/reports/my`

### Admin

- `GET /api/reports`
- `PUT /api/reports/{id}/status`

### Health

- `GET /api/public/health`

## Realtime Channels

- Admin subscription: `/topic/admin/reports`
- User subscription: `/user/queue/reports`
- WebSocket endpoint: `/ws`

Clients authenticate using the JWT in the STOMP `Authorization` header.

## Render Deployment

Create a Render Web Service with:

- Root directory: `backend`
- Environment: `Java`
- Build command: `mvn clean package -DskipTests`
- Start command: `java -Dserver.port=$PORT -jar target/crime-reporting-0.0.1-SNAPSHOT.jar`

Set these environment variables in Render:

- `SQLITE_DB_PATH`
- `JWT_SECRET`
- `APP_CORS_ALLOWED_ORIGINS`
- `WS_ALLOWED_ORIGINS`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `MEDIA_UPLOAD_DIR`

Recommended values:

- `APP_CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app`
- `WS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app`

## Vercel Deployment

Create a Vercel project with the `frontend` directory as the app root.

Build settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Environment variables:

- `VITE_API_BASE_URL=https://your-render-service.onrender.com`
- `VITE_WS_BASE_URL=https://your-render-service.onrender.com`

[`frontend/vercel.json`](/c:/Users/GANESH/OneDrive/Desktop/creame/frontend/vercel.json) is already configured for SPA deep-link rewrites.

## Netlify Deployment

If you prefer Netlify, the SPA fallback file already exists at [`frontend/public/_redirects`](/c:/Users/GANESH/OneDrive/Desktop/creame/frontend/public/_redirects).

## Render Free Tier Notes

- Keep uploaded payloads small (this app enforces lightweight image/video limits).
- Uploaded files are stored on local disk (`uploads/`) and are ephemeral on free tier redeploy/restart.
- SQLite on Render free tier is ephemeral. Data resets on redeploy/restart unless you mount persistent disk.
- Expect cold starts after inactivity
- The frontend is already designed to retry failed requests and reconnect realtime channels
- The admin map intentionally caps the query at 100 recent reports to reduce client memory usage

## Verification

- Frontend production build completed successfully with `npm run build`
- Backend packaging completed successfully with `mvn clean package -DskipTests` using a workspace-local Maven installation
