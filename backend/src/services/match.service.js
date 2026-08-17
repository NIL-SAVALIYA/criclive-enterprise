import prisma from "../config/db.js";
import {
  createMatch,
  getAllMatches,
  getMatchById,
  updateMatch,
  deleteMatch
} from "../repositories/match.repository.js";
import { getTeamById } from "../repositories/team.repository.js";
import { getTournamentById } from "../repositories/tournament.repository.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

const ALLOWED_TRANSITIONS = {
  UPCOMING: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * Creates a new match fixture with team existence and toss guards.
 */
export async function createMatchService(matchData, user = null) {
  if (matchData.teamAId === matchData.teamBId) {
    const error = new Error("Team A and Team B cannot be the same.");
    error.statusCode = 400;
    throw error;
  }

  if (matchData.tournamentId) {
    const tournament = await getTournamentById(matchData.tournamentId);
    if (!tournament) {
      const error = new Error("Tournament not found.");
      error.statusCode = 404;
      throw error;
    }

    if (user && user.role === Roles.ORGANIZER) {
      if (tournament.organizerId && tournament.organizerId !== user.userId) {
        const error = new Error("Access denied. You can only create matches for tournaments you organize.");
        error.statusCode = 403;
        throw error;
      }
    }
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

  if (matchData.scorerId) {
    const scorerUser = await prisma.user.findUnique({
      where: { id: matchData.scorerId },
      include: { role: true }
    });
    if (!scorerUser) {
      const error = new Error("Selected scorer user not found.");
      error.statusCode = 404;
      throw error;
    }
    if (!scorerUser.isActive) {
      const error = new Error("Cannot assign inactive or suspended user as match scorer.");
      error.statusCode = 400;
      throw error;
    }
    if (scorerUser.role?.name !== Roles.SCORER && scorerUser.role?.name !== Roles.ADMIN) {
      const error = new Error("Selected user must have the SCORER role.");
      error.statusCode = 400;
      throw error;
    }
  }

  const payload = {
    ...matchData,
    matchDate: new Date(matchData.matchDate)
  };

  return prisma.$transaction(
    async (tx) => {
      const match = await createMatch(payload, tx);

      await recordAuditLog({
        userId: user ? user.userId : null,
        action: "MATCH_CREATED",
        entityType: "MATCH",
        entityId: match.id,
        metadata: {
          tournamentId: match.tournamentId,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          venue: match.venue
        },
        db: tx
      });

      console.log(`[MATCH EVENT] Match Created | ID: ${match.id} | ${teamA.name} vs ${teamB.name} | Venue: ${match.venue}`);
      return match;
    },
    { maxWait: 15000, timeout: 30000 }
  );
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
 * Updates a match with ownership, status transition, scorer validation, and rescheduling guards.
 */
export async function updateMatchService(id, matchData, user = null) {
  const match = await getMatchById(id);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  // Enforce tournament ownership
  if (user && user.role === Roles.ORGANIZER) {
    if (match.tournament && match.tournament.organizerId && match.tournament.organizerId !== user.userId) {
      const error = new Error("Access denied. You can only modify matches in tournaments you organize.");
      error.statusCode = 403;
      throw error;
    }
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

  // Scorer assignment validation
  let scorerAction = null;
  if ("scorerId" in matchData && matchData.scorerId !== match.scorerId) {
    if (matchData.scorerId) {
      const scorerUser = await prisma.user.findUnique({
        where: { id: matchData.scorerId },
        include: { role: true }
      });

      if (!scorerUser) {
        const error = new Error("Selected scorer user not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!scorerUser.isActive) {
        const error = new Error("Cannot assign inactive or suspended user as match scorer.");
        error.statusCode = 400;
        throw error;
      }

      if (scorerUser.role?.name !== Roles.SCORER && scorerUser.role?.name !== Roles.ADMIN) {
        const error = new Error("Selected user must have the SCORER role.");
        error.statusCode = 400;
        throw error;
      }

      scorerAction = match.scorerId ? "MATCH_SCORER_CHANGED" : "MATCH_SCORER_ASSIGNED";
    } else {
      scorerAction = "MATCH_SCORER_REMOVED";
    }
  }

  // Rescheduling guards for LIVE and COMPLETED matches
  let isRescheduled = false;
  if (matchData.matchDate || matchData.venue) {
    const newDate = matchData.matchDate ? new Date(matchData.matchDate).getTime() : null;
    const oldDate = new Date(match.matchDate).getTime();
    if ((newDate && newDate !== oldDate) || (matchData.venue && matchData.venue !== match.venue)) {
      if (match.status === "LIVE" || match.status === "COMPLETED") {
        const error = new Error(`Cannot reschedule a ${match.status.toLowerCase()} match.`);
        error.statusCode = 400;
        throw error;
      }
      isRescheduled = true;
    }
  }

  const payload = {
    ...matchData,
    ...(matchData.matchDate && { matchDate: new Date(matchData.matchDate) })
  };

  return prisma.$transaction(
    async (tx) => {
      const updated = await updateMatch(id, payload, tx);

      if (scorerAction) {
        await recordAuditLog({
          userId: user ? user.userId : null,
          action: scorerAction,
          entityType: "MATCH",
          entityId: id,
          metadata: {
            matchId: id,
            previousScorerId: match.scorerId,
            newScorerId: updated.scorerId
          },
          db: tx
        });

        if (updated.scorerId) {
          await tx.notification.create({
            data: {
              type: "SCORER_ASSIGNMENT",
              title: "Match Scorer Assignment",
              message: `You have been assigned to score ${match.teamA?.name || "Team A"} vs ${match.teamB?.name || "Team B"}.`,
              matchId: id
            }
          });
        }
      }

      if (isRescheduled) {
        await recordAuditLog({
          userId: user ? user.userId : null,
          action: "MATCH_RESCHEDULED",
          entityType: "MATCH",
          entityId: id,
          metadata: {
            matchId: id,
            newDate: updated.matchDate,
            newVenue: updated.venue
          },
          db: tx
        });
      }

      console.log(`[MATCH EVENT] Match Updated | ID: ${updated.id} | Status: ${updated.status}`);
      return updated;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Deletes a match record with ownership protection.
 */
export async function deleteMatchService(id, user = null) {
  const match = await getMatchById(id);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  // Enforce tournament ownership
  if (user && user.role === Roles.ORGANIZER) {
    if (match.tournament && match.tournament.organizerId && match.tournament.organizerId !== user.userId) {
      const error = new Error("Access denied. You can only delete matches in tournaments you organize.");
      error.statusCode = 403;
      throw error;
    }
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

  return prisma.$transaction(
    async (tx) => {
      const result = await deleteMatch(id, tx);
      console.log(`[MATCH EVENT] Match Deleted | ID: ${id}`);
      return result;
    },
    { maxWait: 15000, timeout: 30000 }
  );
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