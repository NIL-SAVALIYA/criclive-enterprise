import prisma from "../config/db.js";
import {
  createMatch,
  getAllMatches,
  getMatchById,
  updateMatch,
  deleteMatch
} from "../repositories/match.repository.js";
import { getTeamById } from "../repositories/team.repository.js";

const ALLOWED_TRANSITIONS = {
  UPCOMING: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * Creates a new match fixture with team existence and toss guards.
 */
export async function createMatchService(matchData) {
  if (matchData.teamAId === matchData.teamBId) {
    const error = new Error("Team A and Team B cannot be the same.");
    error.statusCode = 400;
    throw error;
  }

  const teamA = await getTeamById(matchData.teamAId);
  if (!teamA) {
    const error = new Error("Team A not found.");
    error.statusCode = 404;
    throw error;
  }

  const teamB = await getTeamById(matchData.teamBId);
  if (!teamB) {
    const error = new Error("Team B not found.");
    error.statusCode = 404;
    throw error;
  }

  if (matchData.tossWinnerId && matchData.tossWinnerId !== matchData.teamAId && matchData.tossWinnerId !== matchData.teamBId) {
    const error = new Error("Toss winner must be either Team A or Team B.");
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    ...matchData,
    matchDate: new Date(matchData.matchDate)
  };

  return prisma.$transaction(async (tx) => {
    const match = await createMatch(payload, tx);
    console.log(`[MATCH EVENT] Match Created | ID: ${match.id} | ${teamA.name} vs ${teamB.name} | Venue: ${match.venue}`);
    return match;
  });
}

/**
 * Retrieves all matches with search, filtering, and pagination.
 */
export async function getAllMatchesService(params = {}) {
  return await getAllMatches(params);
}

/**
 * Retrieves a match by ID.
 */
export async function getMatchByIdService(id) {
  const match = await getMatchById(id);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }
  return match;
}

/**
 * Updates a match with status transition and team/toss guards.
 */
export async function updateMatchService(id, matchData) {
  const match = await getMatchById(id);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  const teamAId = matchData.teamAId || match.teamAId;
  const teamBId = matchData.teamBId || match.teamBId;

  if (teamAId === teamBId) {
    const error = new Error("Team A and Team B cannot be the same.");
    error.statusCode = 400;
    throw error;
  }

  if (matchData.tossWinnerId && matchData.tossWinnerId !== teamAId && matchData.tossWinnerId !== teamBId) {
    const error = new Error("Toss winner must be either Team A or Team B.");
    error.statusCode = 400;
    throw error;
  }

  // Status transition validation
  if (matchData.status && matchData.status !== match.status) {
    const allowed = ALLOWED_TRANSITIONS[match.status] || [];
    if (!allowed.includes(matchData.status)) {
      const error = new Error(`Cannot transition match status from '${match.status}' to '${matchData.status}'.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const payload = {
    ...matchData,
    ...(matchData.matchDate && { matchDate: new Date(matchData.matchDate) })
  };

  return prisma.$transaction(async (tx) => {
    const updated = await updateMatch(id, payload, tx);
    console.log(`[MATCH EVENT] Match Updated | ID: ${updated.id} | Status: ${updated.status}`);
    return updated;
  });
}

/**
 * Deletes a match record.
 */
export async function deleteMatchService(id) {
  const match = await getMatchById(id);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  if (match.status === "LIVE") {
    const error = new Error("Live matches cannot be deleted. Stop or cancel the match first.");
    error.statusCode = 400;
    throw error;
  }

  const inningsCount = match._count?.innings || 0;
  if (inningsCount > 0) {
    const error = new Error(`Cannot delete match '${id}'. Live score or innings data (${inningsCount} innings) already recorded.`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const result = await deleteMatch(id, tx);
    console.log(`[MATCH EVENT] Match Deleted | ID: ${id}`);
    return result;
  });
}

/*
|--------------------------------------------------------------------------
| ARCHITECTURAL EXTENSION HOOKS (FUTURE READY - TASK 15)
|--------------------------------------------------------------------------
| - calculateDLSRevisedTarget(matchId, interruptedOver, lostOvers): DLS calculation engine
| - triggerSuperOver(matchId): Super Over match tie-breaker initialization
| - activateStrategicTimeout(matchId, teamId, over): Tactical timeout tracker
| - substituteImpactPlayer(matchId, outgoingPlayerId, incomingPlayerId): Impact Player rule engine
|--------------------------------------------------------------------------
*/