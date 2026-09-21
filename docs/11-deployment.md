# Deployment

## Local backend

Requirements are Java 21, Maven wrapper, PostgreSQL and Redis. `application.properties` reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET` and `JWT_EXPIRATION_MS`. Flyway migrates automatically at startup.

## Docker

`shiftsync-backend/Dockerfile` builds the backend and `docker-compose.yml` orchestrates dependencies. Firebase service-account configuration is required for push notification paths.

## Web/Mobile

Web: `npm install`, `npm run dev`, `npm run build`, `npm run lint`. Mobile: `npm install`, `npx expo start` or package scripts for web/android/ios. API base URL is configured in each client service layer.

## Production cautions

Replace development JWT secret, protect Swagger/test controllers, provision PostgreSQL/Redis/Firebase secrets and configure CORS/network addresses before deployment.
