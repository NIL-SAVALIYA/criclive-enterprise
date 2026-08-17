import prisma from "../config/db.js";
import { Roles } from "../constants/roles.js";

/**
 * Middleware ensuring only ADMIN, Tournament ORGANIZER, or assigned Match SCORER
 * can perform scoring or match control operations.
 */
export async function authorizeScorer(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    // Global Administrators have full access
    if (user.role === Roles.ADMIN || user.role === Roles.SUPER_ADMIN) {
      return next();
    }

    let match = null;

    if (req.params.matchId) {
      match = await prisma.match.findUnique({
        where: { id: req.params.matchId },
        include: {
          tournament: { select: { organizerId: true } }
        }
      });
    } else if (req.params.inningsId) {
      const innings = await prisma.innings.findUnique({
        where: { id: req.params.inningsId },
        include: {
          match: {
            include: {
              tournament: { select: { organizerId: true } }
            }
          }
        }
      });
      match = innings?.match;
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Target match or innings not found."
      });
    }

    // Tournament Organizer has authority over matches in their tournament
    if (user.role === Roles.ORGANIZER) {
      if (match.tournament && match.tournament.organizerId === user.userId) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only score matches for tournaments you organize."
      });
    }

    // Assigned Scorer has authority over this specific match
    if (match.scorerId && match.scorerId === user.userId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You are not authorized to score or control this match."
    });
  } catch (error) {
    console.error("Scorer authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal authorization check failed."
    });
  }
}
