import prisma from "../config/db.js";

/**
 * Middleware factory that enforces sport isolation.
 * Verifies that the match or innings being operated upon belongs to the expected sport.
 * 
 * @param {string} expectedSportCode - e.g. "CRICKET" or "BADMINTON"
 */
export function requireSport(expectedSportCode) {
  const targetSport = expectedSportCode.trim().toUpperCase();

  return async (req, res, next) => {
    try {
      const matchId = req.params.matchId || req.params.id || req.body?.matchId || req.body?.match_id;
      const inningsId = req.params.inningsId || req.body?.inningsId || req.body?.innings_id;

      let resolvedSportCode = null;

      if (matchId) {
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          select: {
            tournament: {
              select: {
                sport: { select: { code: true } }
              }
            }
          }
        });

        if (!match) {
          return res.status(404).json({
            success: false,
            message: "Match not found."
          });
        }

        resolvedSportCode = match.tournament?.sport?.code || "CRICKET";
      } else if (inningsId) {
        const innings = await prisma.innings.findUnique({
          where: { id: inningsId },
          select: {
            match: {
              select: {
                tournament: {
                  select: {
                    sport: { select: { code: true } }
                  }
                }
              }
            }
          }
        });

        if (!innings) {
          return res.status(404).json({
            success: false,
            message: "Innings not found."
          });
        }

        resolvedSportCode = innings.match?.tournament?.sport?.code || "CRICKET";
      }

      if (resolvedSportCode && resolvedSportCode !== targetSport) {
        return res.status(400).json({
          success: false,
          message: `Sport mismatch violation: Match belongs to ${resolvedSportCode} and cannot perform ${targetSport} operations.`
        });
      }

      next();
    } catch (err) {
      console.error("requireSport error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal error checking sport compatibility."
      });
    }
  };
}
