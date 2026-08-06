/**
 * @file logger.js
 * @description Centralized Structured Logger for CRICLIVE Enterprise Observability & SRE Diagnostics.
 */

export const LogLevel = Object.freeze({
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  FATAL: "FATAL"
});

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    environment: process.env.NODE_ENV || "development",
    message,
    requestId: meta.requestId || null,
    userId: meta.userId || null,
    matchId: meta.matchId || null,
    tournamentId: meta.tournamentId || null,
    method: meta.method || null,
    route: meta.route || null,
    statusCode: meta.statusCode || null,
    executionTimeMs: meta.executionTimeMs || null,
    ip: meta.ip || null,
    socketId: meta.socketId || null,
    error: meta.error ? { message: meta.error.message, stack: meta.error.stack } : null
  });
}

export const logger = {
  debug(message, meta) {
    if (process.env.LOG_LEVEL === "debug") {
      console.log(formatLog(LogLevel.DEBUG, message, meta));
    }
  },

  info(message, meta) {
    console.log(formatLog(LogLevel.INFO, message, meta));
  },

  warn(message, meta) {
    console.warn(formatLog(LogLevel.WARN, message, meta));
  },

  error(message, meta) {
    console.error(formatLog(LogLevel.ERROR, message, meta));
  },

  fatal(message, meta) {
    console.error(formatLog(LogLevel.FATAL, message, meta));
  },

  security(message, meta) {
    console.warn(formatLog(LogLevel.WARN, `[SECURITY EVENT] ${message}`, meta));
  }
};
