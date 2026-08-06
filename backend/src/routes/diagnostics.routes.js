import { Router } from "express";
import { getSystemMetrics, getPrometheusMetrics } from "../controllers/diagnostics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

// Prometheus Metrics Exporter (Public / Collector read-only)
router.get("/metrics", getPrometheusMetrics);

// Admin System Diagnostics (ADMIN only)
router.get("/system/diagnostics", authenticate, authorize(Roles.ADMIN), getSystemMetrics);

export default router;
