import { logger } from "../utils/logger.js";

/**
 * Middleware tracking incoming HTTP requests, response timing, and slow requests (>500ms).
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Generate or forward unique Request ID
  const requestId = req.headers["x-request-id"] || (globalThis.crypto ? globalThis.crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    const executionTimeMs = Date.now() - startTime;
    const meta = {
      requestId,
      method: req.method,
      route: req.originalUrl || req.url,
      statusCode: res.statusCode,
      executionTimeMs,
      ip: req.ip || req.socket?.remoteAddress,
      userId: req.user?.id || null
    };

    if (executionTimeMs > 500) {
      logger.warn(`[SLOW REQUEST] ${req.method} ${req.originalUrl} completed in ${executionTimeMs}ms`, meta);
    } else {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${executionTimeMs}ms`, meta);
    }
  });

  next();
}
