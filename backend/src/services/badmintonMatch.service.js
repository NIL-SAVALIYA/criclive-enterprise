import prisma from "../config/db.js";
import {
  calculateRallyPoint
} from "../engine/badminton/badmintonRule.engine.js";
import {
  getBadmintonMatchStateByMatchId,
  createBadmintonMatchState,
  updateBadmintonMatchState,
  createBadmintonPoint,
  getLatestBadmintonPoint,
  deleteBadmintonPoint
} from "../repositories/badminton.repository.js";
import { emitBadmintonPointRecorded, emitMatchStateUpdated, emitBadmintonPointUndone } from "../socket/socket.server.js";

/**
 * Validates that a match exists and belongs to the BADMINTON sport.
 * Throws 400 error if match belongs to Cricket.
 */
export async function validateBadmintonMatch(matchId, db = prisma) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: {
        include: { sport: true }
      },
      teamA: true,
      teamB: true
    }
  });

  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  const sportCode = match.tournament?.sport?.code;
  if (sportCode && sportCode !== "BADMINTON") {
    const error = new Error(`Match belongs to ${sportCode} and cannot use Badminton scoring.`);
    error.statusCode = 400;
    throw error;
  }

  return match;
}

/**
 * Retrieves the current Badminton match state or initializes it if not present.
 */
export async function getBadmintonMatchStateService(matchId) {
  const match = await validateBadmintonMatch(matchId);

  let matchState = await getBadmintonMatchStateByMatchId(matchId);
  if (!matchState) {
    matchState = await createBadmintonMatchState(matchId);
    matchState.points = [];
  }

  return {
    match: {
      id: match.id,
      venue: match.venue,
      matchDate: match.matchDate,
      status: match.status,
      teamA: match.teamA,
      teamB: match.teamB
    },
    matchState
  };
}

/**
 * Records a rally point for a Badminton match atomically in a transaction.
 */
export async function recordBadmintonPointService(matchId, pointInput) {
  const { scoringTeamId, serverId, receiverId, commentary } = pointInput;

  return prisma.$transaction(
    async (tx) => {
      const match = await validateBadmintonMatch(matchId, tx);

      let currentState = await getBadmintonMatchStateByMatchId(matchId, tx);
      if (!currentState) {
        currentState = await createBadmintonMatchState(matchId, tx);
      }

      // Calculate rally point & next state
      const {
        nextState,
        pointData,
        isGameWon,
        isMatchWon,
        winningTeamId
      } = calculateRallyPoint(currentState, match, scoringTeamId, {
        serverId,
        receiverId,
        commentary
      });

      // Count existing rallies for rally number
      const existingRalliesCount = await tx.badmintonPoint.count({
        where: { badmintonMatchStateId: currentState.id }
      });

      // 1. Create Point record
      const pointRecord = await createBadmintonPoint(
        {
          badmintonMatchStateId: currentState.id,
          gameNumber: pointData.gameNumber,
          rallyNumber: existingRalliesCount + 1,
          scoringTeamId: pointData.scoringTeamId,
          servingTeamId: pointData.servingTeamId,
          serverId: pointData.serverId,
          receiverId: pointData.receiverId,
          scoreTeamA: pointData.scoreTeamA,
          scoreTeamB: pointData.scoreTeamB,
          commentary: pointData.commentary
        },
        tx
      );

      // 2. Update BadmintonMatchState
      const updatedState = await updateBadmintonMatchState(
        currentState.id,
        {
          currentGame: nextState.currentGame,
          teamASetsWon: nextState.teamASetsWon,
          teamBSetsWon: nextState.teamBSetsWon,
          teamAPointsGame1: nextState.teamAPointsGame1,
          teamBPointsGame1: nextState.teamBPointsGame1,
          teamAPointsGame2: nextState.teamAPointsGame2,
          teamBPointsGame2: nextState.teamBPointsGame2,
          teamAPointsGame3: nextState.teamAPointsGame3,
          teamBPointsGame3: nextState.teamBPointsGame3,
          servingTeamId: nextState.servingTeamId,
          currentServerId: nextState.currentServerId,
          currentReceiverId: nextState.currentReceiverId,
          status: nextState.status
        },
        tx
      );

      // 3. Update Match status if match is won
      if (isMatchWon) {
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: "COMPLETED",
            winnerTeamId: winningTeamId,
            result: `Won by ${updatedState.teamASetsWon}-${updatedState.teamBSetsWon} sets`
          }
        });
      } else if (match.status === "UPCOMING") {
        await tx.match.update({
          where: { id: matchId },
          data: { status: "LIVE" }
        });
      }

      // Socket updates (safe execution)
      try {
        emitBadmintonPointRecorded(matchId, { pointRecord, updatedState });
        emitMatchStateUpdated(matchId, { status: updatedState.status });
      } catch (err) {
        console.warn("Socket emission warning:", err.message);
      }

      return {
        matchState: updatedState,
        point: pointRecord,
        isGameWon,
        isMatchWon,
        winnerTeamId: winningTeamId
      };
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Undoes the most recent rally point of a Badminton match atomically.
 */
export async function undoBadmintonPointService(matchId) {
  return prisma.$transaction(
    async (tx) => {
      const match = await validateBadmintonMatch(matchId, tx);

      const currentState = await getBadmintonMatchStateByMatchId(matchId, tx);
      if (!currentState) {
        const error = new Error("No Badminton match state found for this match.");
        error.statusCode = 400;
        throw error;
      }

      const lastPoint = await getLatestBadmintonPoint(currentState.id, tx);
      if (!lastPoint) {
        const error = new Error("No rally points found to undo.");
        error.statusCode = 400;
        throw error;
      }

      // Delete the latest point
      await deleteBadmintonPoint(lastPoint.id, tx);

      // Re-fetch remaining points to recalculate exact state
      const remainingPoints = await tx.badmintonPoint.findMany({
        where: { badmintonMatchStateId: currentState.id },
        orderBy: { createdAt: "asc" }
      });

      // Recalculate state from ground up
      let currentGame = 1;
      let teamASetsWon = 0;
      let teamBSetsWon = 0;
      const gameScores = {
        g1A: 0, g1B: 0,
        g2A: 0, g2B: 0,
        g3A: 0, g3B: 0
      };
      let lastServingTeamId = null;

      for (const p of remainingPoints) {
        const g = p.gameNumber;
        if (p.scoringTeamId === match.teamAId) {
          gameScores[`g${g}A`] += 1;
        } else {
          gameScores[`g${g}B`] += 1;
        }
        lastServingTeamId = p.scoringTeamId;

        // Check if game was won at this point
        const ptA = gameScores[`g${g}A`];
        const ptB = gameScores[`g${g}B`];
        const isGameWon = (ptA >= 21 && ptA - ptB >= 2) || (ptB >= 21 && ptB - ptA >= 2) || ptA === 30 || ptB === 30;

        if (isGameWon) {
          if (ptA > ptB) teamASetsWon += 1;
          else teamBSetsWon += 1;
          if (teamASetsWon < 2 && teamBSetsWon < 2) {
            currentGame = g + 1;
          }
        }
      }

      const isMatchCompleted = teamASetsWon >= 2 || teamBSetsWon >= 2;
      const status = remainingPoints.length === 0 ? "UPCOMING" : (isMatchCompleted ? "COMPLETED" : "LIVE");

      const revertedState = await updateBadmintonMatchState(
        currentState.id,
        {
          currentGame,
          teamASetsWon,
          teamBSetsWon,
          teamAPointsGame1: gameScores.g1A,
          teamBPointsGame1: gameScores.g1B,
          teamAPointsGame2: gameScores.g2A,
          teamBPointsGame2: gameScores.g2B,
          teamAPointsGame3: gameScores.g3A,
          teamBPointsGame3: gameScores.g3B,
          servingTeamId: lastServingTeamId,
          status
        },
        tx
      );

      // Revert Match status if necessary
      await tx.match.update({
        where: { id: matchId },
        data: {
          status,
          winnerTeamId: isMatchCompleted ? (teamASetsWon >= 2 ? match.teamAId : match.teamBId) : null,
          result: isMatchCompleted ? `Won by ${teamASetsWon}-${teamBSetsWon} sets` : null
        }
      });

      // Socket updates (safe execution)
      try {
        emitBadmintonPointUndone(matchId, { undonePointId: lastPoint.id, revertedState });
        emitMatchStateUpdated(matchId, { status });
      } catch (err) {
        console.warn("Socket emission warning:", err.message);
      }

      return {
        matchState: revertedState,
        undonePointId: lastPoint.id
      };
    },
    { maxWait: 15000, timeout: 30000 }
  );
}
