import prisma from "../config/db.js";

/**
 * Retrieves TableTennisMatchState by matchId with full match/sport context and all games.
 */
export async function getTableTennisMatchStateWithContext(matchId, db = prisma) {
  return db.tableTennisMatchState.findUnique({
    where: { matchId },
    include: {
      match: {
        include: {
          tournament: {
            include: { sport: true }
          }
        }
      },
      games: {
        orderBy: { gameNumber: 'asc' }
      }
    }
  });
}

/**
 * Retrieves the full scorecard/timeline of a Table Tennis Match.
 */
export async function getTableTennisScorecard(matchId, db = prisma) {
  return db.tableTennisMatchState.findUnique({
    where: { matchId },
    include: {
      games: {
        orderBy: { gameNumber: 'asc' },
        include: {
          points: {
            orderBy: { createdAt: 'asc' }
          }
        }
      }
    }
  });
}
