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
import { validateAndGetSportByCode } from "./sports.service.js";

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

  const targetSportCode = playerData.sport || "CRICKET";
  const sportEntity = await validateAndGetSportByCode(targetSportCode);

  const cleanData = { ...playerData };
  delete cleanData.sport;

  const FOOTBALL_POSITION_TO_TYPE = {
    GOALKEEPER: "WICKET_KEEPER",
    DEFENDER: "BOWLER",
    MIDFIELDER: "ALL_ROUNDER",
    FORWARD: "BATSMAN"
  };

  let mappedPlayerType = cleanData.playerType;
  if (targetSportCode === "FOOTBALL" && mappedPlayerType && FOOTBALL_POSITION_TO_TYPE[mappedPlayerType]) {
    mappedPlayerType = FOOTBALL_POSITION_TO_TYPE[mappedPlayerType];
  }

  const payload = {
    ...cleanData,
    playerType: mappedPlayerType,
    ...(targetSportCode === "FOOTBALL" && { battingStyle: null, bowlingStyle: null }),
    firstName: playerData.firstName.trim(),
    lastName: playerData.lastName.trim(),
    ...(playerData.dateOfBirth && { dateOfBirth: new Date(playerData.dateOfBirth) }),
    sportId: sportEntity.id
  };

  return prisma.$transaction(async (tx) => {
    const player = await createPlayer(payload, tx);
    console.log(`[PLAYER EVENT] Player Created | ID: ${player.id} | Name: ${player.firstName} ${player.lastName} | Team: ${team.name}`);
    return formatPlayerForSport(player);
  });
}

const TYPE_TO_FOOTBALL_POSITION = {
  WICKET_KEEPER: "GOALKEEPER",
  BOWLER: "DEFENDER",
  ALL_ROUNDER: "MIDFIELDER",
  BATSMAN: "FORWARD"
};

function formatPlayerForSport(player) {
  if (!player) return player;
  const isFootball = player.sport?.code === "FOOTBALL";
  if (isFootball) {
    const pos = TYPE_TO_FOOTBALL_POSITION[player.playerType] || player.playerType;
    return {
      ...player,
      position: pos,
      footballPosition: pos,
      battingStyle: null,
      bowlingStyle: null
    };
  }
  return player;
}

/**
 * Gets all players with search, filtering, and pagination.
 */
export async function getAllPlayersService(params = {}) {
  const result = await getAllPlayers(params);
  if (Array.isArray(result)) {
    return result.map(formatPlayerForSport);
  }
  if (result?.players && Array.isArray(result.players)) {
    return {
      ...result,
      players: result.players.map(formatPlayerForSport)
    };
  }
  return result;
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
  return formatPlayerForSport(player);
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

  const isFootball = player.sport?.code === "FOOTBALL";
  let mappedUpdateType = playerData.playerType;
  if (isFootball && mappedUpdateType && FOOTBALL_POSITION_TO_TYPE[mappedUpdateType]) {
    mappedUpdateType = FOOTBALL_POSITION_TO_TYPE[mappedUpdateType];
  }

  const payload = {
    ...playerData,
    ...(mappedUpdateType !== undefined && { playerType: mappedUpdateType }),
    ...(isFootball && { battingStyle: null, bowlingStyle: null }),
    ...(playerData.firstName && { firstName: playerData.firstName.trim() }),
    ...(playerData.lastName && { lastName: playerData.lastName.trim() }),
    ...(playerData.dateOfBirth && { dateOfBirth: new Date(playerData.dateOfBirth) })
  };

  return prisma.$transaction(async (tx) => {
    const updated = await updatePlayer(id, payload, tx);
    console.log(`[PLAYER EVENT] Player Updated | ID: ${updated.id} | Name: ${updated.firstName} ${updated.lastName}`);
    return formatPlayerForSport(updated);
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