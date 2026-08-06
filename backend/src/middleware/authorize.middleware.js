import { Roles } from "../constants/roles.js";

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Evaluates whether the authenticated user has one of the required roles.
 * @param {...string} allowedRoles - List of permitted roles
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user || (!req.user.role && !req.user.roleId)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Authentication token is required."
        });
      }

      const userRole = req.user.role || req.user.roleId;

      // Allow SUPER_ADMIN or explicit matching roles
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