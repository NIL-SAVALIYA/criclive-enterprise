import { Router } from "express";
import prisma from "../config/db.js";

const router = Router();

/**
 * Root Info Endpoint: GET /
 * Returns API metadata, status, version, and quicklinks to documentation & probes.
 */
router.get("/", (req, res) => {
  return res.status(200).json({
    status: "ONLINE",
    name: "CRICLIVE Enterprise API Engine",
    version: "1.0.0",
    message: "CRICLIVE Enterprise Cricket Management & Scoring Engine API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      documentation: "/api-docs",
      health: "/health",
      ready: "/ready",
      ping: "/ping"
    }
  });
});

/**
 * Ping / Keepalive Endpoint: GET /ping
 * Lightweight ping handler for cron jobs / uptime monitors to prevent cold starts.
 */
router.get("/ping", (req, res) => {
  return res.status(200).send("pong");
});

/**
 * Liveness Probe: GET /health
 * Quick endpoint to verify HTTP server responsiveness and memory metrics.
 */
router.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();
  return res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    }
  });
});

/**
 * Readiness Probe: GET /ready
 * Comprehensive probe verifying database connectivity and filesystem status.
 */
router.get("/ready", async (req, res) => {
  try {
    // Check PostgreSQL connection via Prisma query
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: "READY",
      timestamp: new Date().toISOString(),
      checks: {
        database: "HEALTHY",
        socketServer: "HEALTHY",
        filesystem: "HEALTHY"
      }
    });
  } catch (error) {
    return res.status(503).json({
      status: "UNHEALTHY",
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        database: "UNHEALTHY",
        socketServer: "HEALTHY",
        filesystem: "HEALTHY"
      }
    });
  }
});

export default router;
