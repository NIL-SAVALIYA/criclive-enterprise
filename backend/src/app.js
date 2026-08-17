import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { apiRateLimiter } from "./middleware/rateLimiter.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import roleRoutes from "./routes/role.routes.js";
import userRoutes from "./routes/user.routes.js";
import teamRoutes from "./routes/team.routes.js";
import playerRoutes from "./routes/player.routes.js";
import matchRoutes from "./routes/match.routes.js";
import tournamentRoutes from "./routes/tournament.routes.js";
import tournamentTeamRoutes from "./routes/tournament-team.routes.js";
import fixtureRoutes from "./routes/fixture.routes.js";
import inningsRoutes from "./routes/innings.routes.js";
import ballRoutes from "./routes/ball.routes.js";
import liveScoreRoutes from "./routes/liveScore.routes.js";
import pointsTableRoutes from "./routes/pointsTable.routes.js";
import liveMatchRoutes from "./routes/liveMatch.routes.js";
import commentaryRoutes from "./routes/commentary.routes.js";
import matchSummaryRoutes from "./routes/matchSummary.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import tournamentStatisticsRoutes from "./routes/tournamentStatistics.routes.js";
import playerStatisticsRoutes from "./routes/playerStatistics.routes.js";
import playingXIRoutes from "./routes/playingXI.routes.js";
import tossRoutes from "./routes/toss.routes.js";
import startMatchRoutes from "./routes/startMatch.routes.js";
import endInningsRoutes from "./routes/endInnings.routes.js";

// Advanced Analytics, Records & Notifications Routes
import analyticsRoutes from "./routes/analytics.routes.js";
import recordsRoutes from "./routes/records.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import organizerApplicationRoutes from "./routes/organizerApplication.routes.js";

const app = express();

// Security & Production Middleware
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "https://criclive-frontend-4a55.onrender.com",
    "https://criclive-enterprise-api.onrender.com"
  ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

import { requestLogger } from "./middleware/requestLogger.middleware.js";
import diagnosticsRoutes from "./routes/diagnostics.routes.js";

app.use(requestLogger);
app.use(compression());
app.use(express.json());
app.use("/api/", apiRateLimiter);
app.use("/", diagnosticsRoutes);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

import healthRoutes from "./routes/health.routes.js";

// Health & Readiness Probes
app.use("/", healthRoutes);
app.use("/api", healthRoutes);
app.use("/api/v1", healthRoutes);

// Register Core APIs
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/players", playerRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/tournaments", tournamentRoutes);
app.use("/api/v1/tournaments", tournamentStatisticsRoutes);
app.use("/api/v1/tournament-teams", tournamentTeamRoutes);
app.use("/api/v1/fixtures", fixtureRoutes);
app.use("/api/v1/innings", inningsRoutes);
app.use("/api/v1/innings/:inningsId/balls", ballRoutes);
app.use("/api/matches", liveScoreRoutes);
app.use("/api/points-table", pointsTableRoutes);
app.use("/api/v1/matches", liveMatchRoutes);
app.use("/api/v1/commentary", commentaryRoutes);
app.use("/api/v1/matches", matchSummaryRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/players", playerStatisticsRoutes);
app.use("/api/v1/matches", playingXIRoutes);
app.use("/api/v1/matches", tossRoutes);
app.use("/api/v1/matches", startMatchRoutes);
app.use("/api/v1/innings", endInningsRoutes);

// Advanced Features API Routes
app.use("/api/v1/matches", analyticsRoutes);
app.use("/api/v1/records", recordsRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/organizer-applications", organizerApplicationRoutes);

// 404 Not Found Catch-All Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    error: "Resource Not Found",
    documentation: "/api-docs",
    healthCheck: "/health"
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  void next;
  console.error("🔥 Global Error Handler:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export default app;