import prisma from "../config/db.js";

/**
 * Retrieves BadmintonMatchState by matchId with point history.
 */
export async function getBadmintonMatchStateByMatchId(matchId, db = prisma) {
  return db.badmintonMatchState.findUnique({
    where: { matchId },
    include: {
      points: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

/**
 * Creates initial BadmintonMatchState for a match.
 */
export async function createBadmintonMatchState(matchId, db = prisma) {
  return db.badmintonMatchState.create({
    data: {
      matchId,
      currentGame: 1,
      teamASetsWon: 0,
      teamBSetsWon: 0,
      teamAPointsGame1: 0,
      teamBPointsGame1: 0,
      teamAPointsGame2: 0,
      teamBPointsGame2: 0,
      teamAPointsGame3: 0,
      teamBPointsGame3: 0,
      status: "LIVE"
    }
  });
}

/**
 * Updates BadmintonMatchState.
 */
export async function updateBadmintonMatchState(id, data, db = prisma) {
  return db.badmintonMatchState.update({
    where: { id },
    data
  });
}

/**
 * Creates a BadmintonPoint record.
 */
export async function createBadmintonPoint(data, db = prisma) {
  return db.badmintonPoint.create({
    data
  });
}

/**
 * Gets the most recent BadmintonPoint for a BadmintonMatchState.
 */
export async function getLatestBadmintonPoint(badmintonMatchStateId, db = prisma) {
  return db.badmintonPoint.findFirst({
    where: { badmintonMatchStateId },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Deletes a BadmintonPoint record by ID.
 */
export async function deleteBadmintonPoint(id, db = prisma) {
  return db.badmintonPoint.delete({
    where: { id }
  });
}
