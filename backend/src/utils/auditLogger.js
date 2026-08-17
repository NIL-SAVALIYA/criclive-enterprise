import prisma from "../config/db.js";

/**
 * @file auditLogger.js
 * @description Persistent audit logging system for security, administrative actions, and lifecycle events.
 */

/**
 * Records a generic administrative or system action into the AuditLog table.
 * @param {Object} params
 * @param {string} [params.userId] - ID of the user performing the action
 * @param {string} params.action - Action identifier (e.g. "ORGANIZER_APPLICATION_APPROVED")
 * @param {string} params.entityType - Target entity type (e.g. "ORGANIZER_APPLICATION", "TOURNAMENT")
 * @param {string} [params.entityId] - ID of the target entity
 * @param {Object} [params.metadata] - Extra structured metadata
 * @param {Object} [params.db] - Optional Prisma client or transaction instance
 */
export async function recordAuditLog({
  userId = null,
  action,
  entityType,
  entityId = null,
  metadata = null,
  db = prisma
}) {
  try {
    const log = await db.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? metadata : undefined
      }
    });
    return log;
  } catch (err) {
    // Non-blocking error handler for audit logging
    console.error("[AUDIT LOG ERROR] Failed to record audit entry:", err.message);
    return null;
  }
}

/**
 * Records a login attempt for security monitoring and audit trails.
 */
export async function recordLoginAttempt({
  userId = null,
  email,
  ip = null,
  userAgent = null,
  success,
  failureReason = null,
  db = prisma
}) {
  const timestamp = new Date().toISOString();
  console.log(
    `[AUTH AUDIT ${timestamp}] Email: ${email} | IP: ${ip || "unknown"} | Success: ${success}${
      failureReason ? ` | Reason: ${failureReason}` : ""
    }`
  );

  await recordAuditLog({
    userId,
    action: success ? "USER_LOGIN_SUCCESS" : "USER_LOGIN_FAILED",
    entityType: "USER",
    entityId: userId,
    metadata: {
      email,
      ip,
      userAgent,
      success,
      failureReason
    },
    db
  });
}
