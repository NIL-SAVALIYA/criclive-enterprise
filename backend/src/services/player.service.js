import prisma from "../config/db.js";
import {
  createPlayer,
  getAllPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  findPlayerByJerseyNumber
} from "../repositories/player.repository.js";
import { getTeamById } from "../repositories/team.repository.js";

/**
 * Creates a new player with team existence and unique jersey number validation.
 */
export async function createPlayerService(playerData) {
  const team = await getTeamById(playerData.teamId);
  if (!team) {
    const error = new Error("Assigned team does not exist.");
    error.statusCode = 404;
    throw error;
  }

  if (playerData.jerseyNumber !== undefined && playerData.jerseyNumber !== null) {
    const existingJersey = await findPlayerByJerseyNumber(playerData.teamId, playerData.jerseyNumber);
    if (existingJersey) {
      const error = new Error(`Jersey number #${playerData.jerseyNumber} is already assigned to ${existingJersey.firstName} ${existingJersey.lastName} in team '${team.name}'.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const payload = {
    ...playerData,
    firstName: playerData.firstName.trim(),
    lastName: playerData.lastName.trim(),
    ...(playerData.dateOfBirth && { dateOfBirth: new Date(playerData.dateOfBirth) })
  };

  return prisma.$transaction(async (tx) => {
    const player = await createPlayer(payload, tx);
    console.log(`[PLAYER EVENT] Player Created | ID: ${player.id} | Name: ${player.firstName} ${player.lastName} | Team: ${team.name}`);
    return player;
  });
}

/**
 * Gets all players with search, filtering, and pagination.
 */
export async function getAllPlayersService(params = {}) {
  return await getAllPlayers(params);
}

/**
 * Gets a player by ID.
 */
export async function getPlayerByIdService(id) {
  const player = await getPlayerById(id);
  if (!player) {
    const error = new Error("Player not found.");
    error.statusCode = 404;
    throw error;
  }
  return player;
}

/**
 * Updates a player with jersey uniqueness validation.
 */
export async function updatePlayerService(id, playerData, currentUser = null) {
  const player = await getPlayerById(id);
  if (!player) {
    const error = new Error("Player not found.");
    error.statusCode = 404;
    throw error;
  }

  const targetTeamId = playerData.teamId || player.teamId;

  // RBAC scope check for TEAM_MANAGER role
  if (currentUser && currentUser.role === "TEAM_MANAGER") {
    const managerTeam = await prisma.team.findFirst({ where: { managerId: currentUser.userId } });
    if (!managerTeam || managerTeam.id !== player.teamId) {
      const error = new Error("Access denied. You can only update players belonging to your managed team.");
      error.statusCode = 403;
      throw error;
    }
  }

  if (playerData.jerseyNumber !== undefined && playerData.jerseyNumber !== null) {
    if (playerData.jerseyNumber !== player.jerseyNumber || targetTeamId !== player.teamId) {
      const existingJersey = await findPlayerByJerseyNumber(targetTeamId, playerData.jerseyNumber);
      if (existingJersey && existingJersey.id !== id) {
        const error = new Error(`Jersey number #${playerData.jerseyNumber} is already assigned in target team.`);
        error.statusCode = 409;
        throw error;
      }
    }
  }

  const payload = {
    ...playerData,
    ...(playerData.firstName && { firstName: playerData.firstName.trim() }),
    ...(playerData.lastName && { lastName: playerData.lastName.trim() }),
    ...(playerData.dateOfBirth && { dateOfBirth: new Date(playerData.dateOfBirth) })
  };

  return prisma.$transaction(async (tx) => {
    const updated = await updatePlayer(id, payload, tx);
    console.log(`[PLAYER EVENT] Player Updated | ID: ${updated.id} | Name: ${updated.firstName} ${updated.lastName}`);
    return updated;
  });
}

/**
 * Deletes a player with delete-protection guards.
 */
export async function deletePlayerService(id) {
  const player = await getPlayerById(id);
  if (!player) {
    const error = new Error("Player not found.");
    error.statusCode = 404;
    throw error;
  }

  const counts = player._count || {};
  const totalRecords =
    (counts.battingScorecards || 0) +
    (counts.bowlingScorecards || 0) +
    (counts.playingXI || 0) +
    (counts.battingBalls || 0) +
    (counts.bowlingBalls || 0) +
    (counts.dismissals || 0);

  if (totalRecords > 0) {
    const error = new Error(`Cannot delete player '${player.firstName} ${player.lastName}'. Historical match scorecards or ball delivery records exist.`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const result = await deletePlayer(id, tx);
    console.log(`[PLAYER EVENT] Player Deleted | ID: ${id} | Name: ${player.firstName} ${player.lastName}`);
    return result;
  });
}

/*
|--------------------------------------------------------------------------
| ARCHITECTURAL EXTENSION HOOKS (FUTURE READY - TASKS 12, 13, 14)
|--------------------------------------------------------------------------
| - calculatePlayerCareerStats(playerId): Career Runs, Wickets, Average, SR
| - validatePlayingXIEligibility(playerId, matchId): Playing XI & Impact Player rules
| - calculateAuctionBasePrice(playerId): Player Auction valuation & retention hooks
| - updatePlayerStatus(playerId, status): AVAILABLE, INJURED, SUSPENDED engine
|--------------------------------------------------------------------------
*/