/**
 * @file auditLogger.js
 * @description Reusable placeholder for authentication and security audit logging.
 */

/**
 * Records a login attempt for security monitoring and audit trails.
 * @param {Object} params
 * @param {string} [params.userId] - ID of the user if identified
 * @param {string} params.email - Email address attempted
 * @param {string} [params.ip] - IP address of the client
 * @param {string} [params.userAgent] - User agent header
 * @param {boolean} params.success - Whether authentication succeeded
 * @param {string} [params.failureReason] - Reason for authentication failure
 */
export async function recordLoginAttempt({
  email,
  ip = null,
  success,
  failureReason = null
}) {
  // TODO: Future persistence - insert record into AuditLog database table when schema is migrated
  // TODO: Future enhancement - IP geolocation tracking and anomaly detection
  const timestamp = new Date().toISOString();
  console.log(`[AUTH AUDIT ${timestamp}] Email: ${email} | IP: ${ip || 'unknown'} | Success: ${success}${failureReason ? ` | Reason: ${failureReason}` : ''}`);
}
