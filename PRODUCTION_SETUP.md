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
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | *Choose a strong, 64-character random string* |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `ALLOWED_ORIGINS` | Comma-separated list of permitted CORS origins | `https://yourdomain.com,https://api.yourdomain.com` |
| `CLIENT_URL` | Base URL of the client SPA | `https://yourdomain.com` |
| `CAPTCHA_SECRET_KEY` | Cloudflare Turnstile secret key | *Obtained from Cloudflare Dashboard* |

Create and configure your `.env` file in the `frontend/` directory using:

| Variable Name | Description | Example / Recommended Value |
| --- | --- | --- |
| `VITE_API_URL` | Base API URL of your deployed backend | `https://api.yourdomain.com` |
| `VITE_CAPTCHA_SITE_KEY`| Cloudflare Turnstile site key | *Obtained from Cloudflare Dashboard* |

---

## 3. Build & Deployment Steps

Follow these steps sequentially to deploy the application:

### Step A: Database Setup & Migration
1. Ensure the PostgreSQL database is online and reachable.
2. Run database migrations to provision the schema:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
3. Run the database seed script to populate sports (`CRICKET`, `BADMINTON`) and setup initial roles:
   ```bash
   node prisma/seed.js
   ```

### Step B: Backend Build & Start
1. Install dependencies:
   ```bash
   cd backend
   npm install --production=false
   ```
2. Generate the Prisma Client wrapper code:
   ```bash
   npx prisma generate
   ```
3. Start the production server:
   ```bash
   npm start
   ```

### Step C: Frontend Build & Serve
1. Install dependencies:
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

## 4. Production Security Recommendations
- **SSL/TLS**: Ensure both API and Client domains are served exclusively over HTTPS.
- **Secrets Management**: Never commit actual `.env` files or credentials into git. Use environment injections provided by your cloud provider (e.g., Render, AWS, Heroku).
- **Prisma Client Locks**: If rebuilding/regenerating the Prisma client on a running Windows environment, shut down Node server instances temporarily to prevent EPERM file locking errors.
