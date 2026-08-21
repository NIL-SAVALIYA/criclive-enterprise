import prisma from "../config/db.js";
import { Roles } from "../constants/roles.js";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Dual-mode middleware for Match Scoring operations:
 * Accepts EITHER:
 * 1. Match-specific Scoring Access Token (via header 'x-scoring-token', query 'scoringToken'/'token', or body 'scoringToken')
 * 2. Authenticated User JWT (ADMIN, tournament ORGANIZER, or assigned SCORER)
 */
export async function authorizeScorer(req, res, next) {
  try {
    const scoringToken =
      req.headers["x-scoring-token"] ||
      req.query.scoringToken ||
      req.query.token ||
      req.body?.scoringToken;

    // 1. Resolve target match or innings
    let match = null;
    const matchId = req.params.matchId || req.body?.matchId;
    const inningsId = req.params.inningsId || req.body?.inningsId;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (matchId && !UUID_REGEX.test(matchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid format for one or more parameters. Check that all IDs are valid UUIDs."
      });
    }
    if (inningsId && !UUID_REGEX.test(inningsId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid format for one or more parameters. Check that all IDs are valid UUIDs."
      });
    }

    if (matchId) {
      match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          tournament: { select: { organizerId: true } }
        }
      });
    } else if (inningsId) {
      const innings = await prisma.innings.findUnique({
        where: { id: inningsId },
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

    // 2. Check Match Scoring Access Token
    if (scoringToken && typeof scoringToken === "string") {
      if (match.scoringToken && match.scoringToken === scoringToken) {
        req.isTokenScorer = true;
        req.scoringMatchId = match.id;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: "Invalid, expired, or revoked scoring access link."
      });
    }

    // 3. Fallback to User JWT Authentication
    let user = req.user;
    if (!user) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          user = jwt.verify(token, env.JWT_SECRET);
          req.user = user;
        } catch {
          return res.status(401).json({
            success: false,
            message: "Invalid or expired user session."
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authorization required. Please provide a valid scoring access token or sign in."
      });
    }

    // Global Administrators have full access
    if (user.role === Roles.ADMIN || user.role === Roles.SUPER_ADMIN) {
      return next();
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
