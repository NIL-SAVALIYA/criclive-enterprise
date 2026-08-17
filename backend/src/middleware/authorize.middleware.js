import prisma from "../config/db.js";
import { Roles } from "../constants/roles.js";

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Checks live user role from database for real-time suspension/promotion enforcement.
 * @param {...string} allowedRoles - List of permitted roles
 */
export function authorize(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Authentication token is required."
        });
      }

      let userRole = req.user.role;

      // Live role lookup from database to enforce instant suspension / role revocation
      try {
        const liveUser = await prisma.user.findUnique({
          where: { id: req.user.userId },
          include: { role: true }
        });
        if (liveUser?.role?.name) {
          userRole = liveUser.role.name;
          req.user.role = userRole;
        }
      } catch {
        // Fallback to token role if transient db read fails
      }

      const isAuthorized =
        userRole === Roles.SUPER_ADMIN ||
        allowedRoles.includes(userRole);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Insufficient permissions for this resource."
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error"
      });
    }
  };
}