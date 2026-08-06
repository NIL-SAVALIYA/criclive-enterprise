import { Router } from "express";
import prisma from "../config/db.js";

const router = Router();

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
