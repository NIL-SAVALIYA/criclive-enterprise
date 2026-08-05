# 🏏 Cricket League Management System (Version 1.0 Production Release)

An Enterprise-grade, Production-Ready **Cricket League Management System** modeled after platforms like Cricbuzz and CricHeroes.

Designed using clean 5-layer backend architecture (`Controller → Service → Engine → Repository → Prisma ORM → PostgreSQL`) and modern React 19 SPA frontend with real-time Socket.IO synchronization.

---

## 🌟 Core System Architecture

```text
       React 19 SPA (Vite + TailwindCSS + Socket.IO Client)
                              │
                              ▼
           Express.js REST APIs & Socket.IO Server
                              │
                              ▼
                 Controllers (Zod Validation)
                              │
                              ▼
                        Service Layer
                              │
                              ▼
                Engine Layer (Win Prob / Analytics)
                              │
                              ▼
                    Repository Layer
                              │
                              ▼
                      Prisma ORM Client
                              │
                              ▼
                    PostgreSQL 16 Database
```

---

## ⚡ Key Features

### 🔐 1. Authentication & Role-Based Access Control (RBAC)
- JWT token authentication with bcrypt password hashing.
- Granular permissions for `ADMIN`, `ORGANIZER`, `SCORER`, and public `VIEWER` roles.
- Protected client-side routes & server-side authorization middleware.

### 🏆 2. Tournament & League Management
- Support for multiple tournament formats (`LEAGUE`, `KNOCKOUT`, `ROUND_ROBIN`, `HYBRID`).
- Automated round-robin schedule generator engine.
- Real-time Net Run Rate (NRR) and Points Table calculation engine.

### 🛡️ 3. Team & Squad Management
- Franchise team profiles, short codes, cities, and player capacity counts.
- Squad roster management with captain (`C`) and vice-captain (`VC`) designations.

### 🏏 4. Player Directory & Career Statistics
- Complete player directory with role filters (`BATSMAN`, `BOWLER`, `ALL_ROUNDER`, `WICKET_KEEPER`).
- Comprehensive career statistics tracking (innings, runs, average, SR, 50s, 100s, overs, wickets, economy, 3W/5W hauls).

### ⚡ 5. Real-Time Live Match Center & Socket.IO
- Ball-by-ball live match scoring console for official match scorers (`ADMIN`, `SCORER`).
- Real-time zero-polling Socket.IO broadcast (`SCORE_UPDATED`, `COMMENTARY_ADDED`, `SCORECARD_REFRESH`).
- Cricbuzz-like live match screen featuring:
  - Live Score & Recent Balls Ticker
  - Current Batters at Crease (`*`) & Active Bowler Strip
  - Current Partnership Summary & Target / Required Run Rate (RRR)
  - Full Batting & Bowling Scorecards
  - Ball-by-ball Live Commentary stream
  - Interactive SVG 8-Zone Wagon Wheel & Pitch Map Heatmap
  - AI Live Win Probability Meter

### 📊 6. Enterprise Admin Dashboard & Telemetry
- High-level metric cards (Tournaments, Teams, Players, Active Matches, Socket Status).
- Live match telemetry monitoring.
- Orange Cap (Most Runs) & Purple Cap (Most Wickets) leaderboards.
- Interactive Recharts analytics for team capacity & tournament formats.
- System notification broadcast center.

### 🛡️ 7. Production Hardening & CI/CD
- **OpenAPI 3.0 (Swagger)** live API documentation at `/api-docs`.
- **Security & Performance**: Helmet HTTP security headers, CORS protection, Rate limiting, Gzip compression.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` with PostgreSQL 16 Alpine.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) for automated building, database migration, and test execution.

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express.js** (5-Layer Architecture)
- **PostgreSQL 16** (Database)
- **Prisma ORM** (Schema & Query Engine)
- **Socket.IO** (Real-Time WebSockets)
- **JWT & bcrypt** (Security & Authentication)
- **Zod** (Request Schema Validation)
- **Swagger UI** (API Documentation)
- **Helmet, Cors, Compression, Express-Rate-Limit** (Security & Middleware)

### Frontend
- **React 19 & Vite** (Build System & Single Page Application)
- **Tailwind CSS & Lucide Icons** (Glassmorphic Dark Mode UI)
- **Socket.IO Client** (WebSocket Client Hook)
- **React Router DOM v7** (Client Navigation & Guards)
- **Axios** (API Client with Interceptors)
- **Recharts** (Data Visualization)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v20+
- PostgreSQL 16+
- Docker & Docker Compose (Optional)

### 1. Local Setup

#### Backend Setup
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
npm run dev
```
- Server starts on `http://localhost:5000`
- Swagger Docs available at `http://localhost:5000/api-docs`

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- SPA Client opens on `http://localhost:5173`

---

### 2. Docker Deployment

Launch the complete stack (PostgreSQL + Express Backend):
```bash
docker-compose up --build -d
```

---

## 🧪 Verification & Automated Testing

Run the automated integration test suite:
```bash
cd backend
npm test
```

Test Results:
- Health Check (`GET /api/v1/health`)
- Leaderboards (`GET /api/v1/records/caps-and-leaders`)
- MVP Ranking (`GET /api/v1/records/mvp-leaderboard`)
- Notifications (`GET /api/v1/notifications`)
- Analytics (`GET /api/v1/matches/:id/analytics`)
- Career Records (`GET /api/v1/players/:id/career-records`)
- RBAC Authorization Guards (`401 Unauthenticated Verification`)
- Swagger Docs UI (`GET /api-docs`)

---

## 👨‍💻 Author & License

**Cricket League Management System**  
Built by Nil Savaliya ([NIL-SAVALIYA](https://github.com/NIL-SAVALIYA))  
License: MIT