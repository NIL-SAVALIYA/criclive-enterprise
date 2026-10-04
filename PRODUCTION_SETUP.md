# CricLive Enterprise — Production Setup & Deployment Guide

This document describes the requirements, configuration, and instructions to deploy and host the multi-sport CricLive Enterprise application in a production environment.

## 1. System Requirements
- Node.js (v18.x or v20.x recommended)
- PostgreSQL database instance (v14 or higher)

---

## 2. Environment Variables

Create and configure your `.env` file in the `backend/` directory using the following variables:

| Variable Name | Description | Example / Recommended Value |
| --- | --- | --- |
| `PORT` | The port the backend server listens on | `5000` |
| `NODE_ENV` | Environment target | `production` |
| `LOG_LEVEL` | Level of logging granularity | `info` or `warn` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/cricket_db?schema=public&connection_limit=20&pool_timeout=10` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | *Choose a strong, 64-character random string* |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `ALLOWED_ORIGINS` | Comma-separated list of permitted CORS origins | `https://yourdomain.com,https://api.yourdomain.com` |
| `CLIENT_URL` | Base URL of the client SPA | `https://yourdomain.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window in milliseconds | `900000` |
| `RATE_LIMIT_MAX` | Maximum requests per window | `1000` |
| `CAPTCHA_SECRET_KEY` | Cloudflare Turnstile secret key | *Obtained from Cloudflare Dashboard* |

Create and configure your `.env` file in the `frontend/` directory using:

| Variable Name | Description | Example / Recommended Value |
| --- | --- | --- |
| `VITE_API_URL` | Base API URL of your deployed backend | `https://api.yourdomain.com` |
| `VITE_CAPTCHA_SITE_KEY`| Cloudflare Turnstile site key | *Obtained from Cloudflare Dashboard* |

---

## 3. Build & Deployment Steps

Follow these steps sequentially to deploy the application:

### Step A: Backend Install & Database Setup
1. Install backend dependencies (required before running Prisma):
   ```bash
   cd backend
   npm install
   ```
2. Generate the Prisma Client wrapper code:
   ```bash
   npx prisma generate
   ```
3. Run database migrations to provision the schema:
   ```bash
   npx prisma migrate deploy
   ```
4. Run the database seed script to populate sports (`CRICKET`, `BADMINTON`) and initial roles:
   ```bash
   node prisma/seed.js
   ```
5. Start the production server:
   ```bash
   npm start
   ```

### Step B: Frontend Build & Serve
1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Compile the production-ready static assets:
   ```bash
   npm run build
   ```
3. Serve the generated static files located in `frontend/dist/` using a static server, CDN, or proxy rewrite (such as Nginx or Render static hosting).

---

## 4. Render.com Deployment Reference

The repository includes a `render.yaml` file for one-click deployment on [Render](https://render.com).

Backend build command (as configured in `render.yaml`):
```
cd backend && npm install && npx prisma generate
```

Backend start command:
```
cd backend && node src/server.js
```

Frontend build command:
```
cd frontend && npm install && npm run build
```

The frontend is served from `frontend/dist/` as a static site with SPA fallback rewrite enabled.

---

## 5. Production Security Recommendations
- **SSL/TLS**: Ensure both API and Client domains are served exclusively over HTTPS.
- **Secrets Management**: Never commit actual `.env` files or credentials into git. Use environment injections provided by your cloud provider (e.g., Render, AWS, Heroku).
- **Rate Limiting**: Configure `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` appropriately for your traffic. Defaults protect against 1000 requests per 15-minute window.
- **Prisma Client Locks**: If rebuilding/regenerating the Prisma client on a running Windows environment, shut down Node server instances temporarily to prevent EPERM file locking errors.
