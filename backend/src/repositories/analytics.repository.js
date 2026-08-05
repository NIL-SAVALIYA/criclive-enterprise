import prisma from "../config/db.js";

/**
 * Fetch all balls for a given match, structured by innings
 */
export async function getMatchBallsRepository(matchId) {
  return await prisma.ball.findMany({
    where: {
      innings: { matchId }
    },
    include: {
      batsman: true,
      bowler: true,
      innings: true
    },
    orderBy: { deliveryNumber: "asc" }
  });
}

/**
 * Fetch innings partnerships with player info
 */
export async function getInningsPartnershipsRepository(inningsId) {
  return await prisma.partnership.findMany({
    where: { inningsId },
    include: {
      striker: true,
      nonStriker: true
    },
    orderBy: { createdAt: "asc" }
  });
}

/**
 * Fetch fall of wickets for an innings
 */
export async function getInningsFallOfWicketsRepository(inningsId) {
  return await prisma.fallOfWicket.findMany({
    where: { inningsId },
    include: {
      player: true
    },
    orderBy: { wicketNumber: "asc" }
  });
}
